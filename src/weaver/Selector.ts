import JoinPoints from "./JoinPoints.js";
import Weaver from "./Weaver.js";
import JpFilter from "../lara/util/JpFilter.js";
import Accumulator from "../lara/util/Accumulator.js";
import Check from "../lara/Check.js";

/**
 * Selects join points according to their type and filter rules.
 *
 */
export default class Selector {
    #$currentJps: any[] | undefined;
    #lastName: string | undefined;
    #joinPoints: JoinPoints;
    #addBaseJp: boolean;

    constructor($baseJp: any, inclusive: boolean = false) {
        this.#$currentJps =
            $baseJp === undefined ? undefined : [Selector.#newJpChain($baseJp)];
        this.#lastName =
            $baseJp === undefined ? undefined : Selector.#STARTING_POINT;

        this.#joinPoints = new JoinPoints();
        this.#addBaseJp = inclusive;
    }

    /// STATIC VARIABLES

    static #STARTING_POINT: string = "_starting_point";
    static #COUNTER: string = "_counter";

    /// STATIC FUNCTIONS

    static #copyChain($jpChain: any) {
        var copy = Object.assign({}, $jpChain);

        copy[Selector.#COUNTER] = copy[Selector.#COUNTER].copy();

        return copy;
    }

    static #newJpChain($startingPoint: any) {
        // Add starting point
        var chain: { [key: string]: any } = { _starting_point: $startingPoint };

        // Add counter
        chain[Selector.#COUNTER] = new Accumulator();

        return chain;
    }

    static #parseFilter(
        filter: Object | String | Function | RegExp | undefined,
        name: string
    ) {
        // If undefined, return empty object
        if (filter === undefined) {
            return {};
        }

        // If filter is not an object, or if it is a regex, build object with default attribute of given jp name
        if (!(filter instanceof Object) || filter instanceof RegExp) {
            // Get default attribute
            var defaultAttr = Weaver.getDefaultAttribute(name);

            // If no default attribute, return empty filter
            if (defaultAttr === undefined) {
                console.log(
                    "Selector: cannot use default filter for join point '" +
                        name +
                        "', it does not have a default attribute"
                );
                return {};
            }

            return { [defaultAttr]: filter };
        }

        // Just return the filter
        return filter;
    }

    /// INSTANCE FUNCTIONS
    *[Symbol.iterator]() {
        var $jps = this.get();
        for (var $jp of $jps) {
            yield $jp;
        }
    }

    search(name: string, filter?: Object | String | Function | RegExp) {
        return this.#searchPrivate(
            name,
            filter,
            function ($jp: any, joinPoints: JoinPoints, name: string) {
                return joinPoints.descendants($jp, name);
            }
        );
    }

    children(name: string, filter?: Object | String | Function | RegExp) {
        return this.#searchPrivate(
            name,
            filter,
            function ($jp: any, joinPoints: JoinPoints, name: string) {
                return joinPoints.children($jp, name);
            }
        );
    }

    scope(name: string, filter?: Object | String | Function | RegExp) {
        return this.#searchPrivate(
            name,
            filter,
            function ($jp: any, joinPoints: JoinPoints, name: string) {
                return joinPoints.scope($jp, name);
            }
        );
    }

    #searchPrivate(
        name: string,
        filter: Object | String | Function | RegExp | undefined,
        selectFunction: Function
    ) {
        Check.isDefined(selectFunction, "selectFunction");

        if (name === undefined) {
            name = "joinpoint";
        }

        var jpFilter = new JpFilter(Selector.#parseFilter(filter, name));

        var $newJps: any[] = [];

        // If add base jp, this._$currentJps must have at most 1 element
        if (this.#addBaseJp && this.#$currentJps !== undefined) {
            if (this.#$currentJps.length === 0) {
                throw "Selector._searchPrivate: 'inclusive' is true, but currentJps is empty, can this happen?";
            }

            if (this.#$currentJps.length > 1) {
                throw (
                    "Selector._searchPrivate: 'inclusive' is true, but currentJps is larger than one ('" +
                    this.#$currentJps.length +
                    "')"
                );
            }

            this.#addBaseJp = false;

            // Filter does not test if the join point is of the right type
            if (this.#lastName !== undefined) {
                var $root = this.#$currentJps[0][this.#lastName];
                if ($root.instanceOf(name)) {
                    this.#addJps(
                        $newJps,
                        [$root],
                        jpFilter,
                        this.#$currentJps[0],
                        name
                    );
                }
            }
        }

        var isCurrentJpsUndefined = this.#$currentJps === undefined;
        this.#$currentJps = isCurrentJpsUndefined
            ? [Selector.#newJpChain(this.#joinPoints.root())]
            : this.#$currentJps;
        this.#lastName = isCurrentJpsUndefined
            ? Selector.#STARTING_POINT
            : this.#lastName;

        // Each $jp is an object with the current chain
        if (this.#$currentJps !== undefined && this.#lastName !== undefined) {
            for (var $jpChain of this.#$currentJps) {
                var $jp = $jpChain[this.#lastName];
                var $allJps = selectFunction($jp, this.#joinPoints, name);
                this.#addJps($newJps, $allJps, jpFilter, $jpChain, name);
            }
        }

        // Update
        this.#$currentJps = $newJps;
        this.#lastName = name;

        return this;
    }

    #addJps(
        $newJps: any[],
        $jps: any[],
        jpFilter: JpFilter,
        $jpChain: any[],
        name: string
    ) {
        for (var $jp of $jps) {
            var $filteredJp = jpFilter.filter([$jp]);

            if ($filteredJp.length === 0) {
                continue;
            }

            if ($filteredJp.length > 1) {
                throw (
                    "Selector._addJps: Expected $filteredJp to have length 1, has " +
                    $filteredJp.length
                );
            }

            // Copy chain
            var $updatedChain = Selector.#copyChain($jpChain);

            // Update join point
            $updatedChain[name] = $jp;

            // Add jp with unique id
            var id = name + "_" + $updatedChain[Selector.#COUNTER].add(name);
            $updatedChain[id] = $jp;

            $newJps.push($updatedChain);
        }
    }

    /**
     * @return an array with the join points of the last chain (e.g., search("function").search("call").get() returns an array of $call join points).
     */
    get() {
        if (this.#$currentJps === undefined) {
            console.log(
                "Selector.get(): no join points have been searched, have you called a search function? (e.g., search, children)"
            );
            return [];
        }

        var returnJps = [];
        if (this.#lastName !== undefined) {
            for (var $jpChain of this.#$currentJps) {
                returnJps.push($jpChain[this.#lastName]);
            }
        }

        this.#$currentJps = undefined;
        return returnJps;
    }

    /**
     * @return an array of objects where each object maps the name of the join point to the corresponding join point that was searched, as well as creating mappings of the format <joinpoint_name>_<repetition>. For instance, if the search chain has the same name multiple times (e.g., search("loop").search("loop")), the chain object will have an attribute "loop" mapped to the last loop of the chain, an attribute "loop_0" mapped to the first loop of the chain and an attribute "loop_1" mapped to the second loop of the chain.
     */
    chain() {
        if (this.#$currentJps === undefined) {
            console.log(
                "Selector.get(): no join points have been searched, have you called a search function? (e.g., search, children)"
            );
            return [];
        }

        var returnJps = this.#$currentJps;

        this.#$currentJps = undefined;
        return returnJps;
    }

    //  * @arg {bool} warnIfMultiple - if true, displays a warning if the search returns more than one result

    /**
     * Same as .first()
     *
     */
    getFirst() {
        var $jps = this.get();
        if ($jps.length === 0) {
            console.log("Selector.getFirst(): no join point found");
            return undefined;
        }

        return $jps[0];
    }

    /**
     * @return {$jp} the first selected join point
     */
    first() {
        return this.getFirst();
    }
}
