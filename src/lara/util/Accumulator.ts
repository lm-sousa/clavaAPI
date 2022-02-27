import { checkTrue, toArray } from "../LaraCore";
import StringSet from "./StringSet";

/**
 * Counts occurrences of tuples.
 */
export default class Accumulator {
    value = 0;
    accs: { [key: string]: Accumulator } = {};
    seenKeys = new StringSet();

    /**
     * Adds the tuple to the accumulator. Each time a tuple is added, the corresponding value increments by 1.
     *
     * Alternatively, can also receive an array with the chain of values
     *
     * @return {Integer} the previous count of the added element
     */
    add(key: any | any[], ...keys: any[]) {
        var chainArray = this.#parseArguments(arguments);

        var currentAcc: Accumulator = this;

        // Travel chain of values
        for (var chainElement of chainArray) {
            var nextAcc = currentAcc.accs[chainElement];

            // If no accumulator, create
            if (nextAcc === undefined) {
                nextAcc = new Accumulator();
                currentAcc.accs[chainElement] = nextAcc;
                currentAcc.seenKeys.add(chainElement);
            }

            // Update acc
            currentAcc = nextAcc;
        }

        // Store previous value
        var previousValue = currentAcc.value;

        // Increment acc value
        currentAcc.value++;

        return previousValue;
    }

    /**
     * Adds the value associated to the given tuple. If no value is defined for the given tuple, returns 0.
     * <p>
     * Alternatively, can also receive an array with the chain of values
     */
    get(key: any | any[], ...keys: any[]) {
        var chainArray = this.#parseArguments(arguments);

        var currentAcc: Accumulator = this;

        // Travel chain of values
        for (var chainElement of chainArray) {
            var nextAcc = currentAcc.accs[chainElement];
            // If no accumulator, return 0
            if (nextAcc === undefined) {
                return 0;
            }

            // Update acc
            currentAcc = nextAcc;
        }

        // Return acc value
        return currentAcc.value;
    }

    copy() {
        var copy = new Accumulator();

        for (var key of this.keys()) {
            var value = this.get(key);

            // TODO: Not efficient, should have a method to internally set a value
            for (var i = 0; i < value; i++) {
                copy.add(key);
            }
        }

        return copy;
    }

    /**
     * Returns an array of arrays with keys that have a value set.
     */
    keys() {
        var chains: any[] = [];
        var currentChain: string | any[] = [];

        this._keysPrivate(currentChain, chains);
        return chains;
    }

    // TODO: Use # for private functions?
    _keysPrivate(currentChain: string | any[], chains: any[]) {
        // If this accumulator has a value, add current chain
        if (this.value > 0) {
            chains.push(currentChain);
        }

        for (var key of this.seenKeys.values()) {
            var updatedChain = currentChain.concat(key);

            var nextAcc = this.accs[key];

            if (nextAcc === undefined) {
                continue;
            }
            nextAcc._keysPrivate(updatedChain, chains);
        }
    }

    /**
     * Receives an array with the arguments of the previous function.
     */
    #parseArguments(args: IArguments) {
        checkTrue(
            arguments.length === 1,
            "Accumulator._parseArguments: Expected arguments to have length 1"
        );

        // If one argument and array, return it
        if (args.length === 1 && args[0] instanceof Array) {
            // Retrive the array in the previous arguments
            return args[0];
        }

        // Transform arguments into array
        return toArray(args);
    }
}
