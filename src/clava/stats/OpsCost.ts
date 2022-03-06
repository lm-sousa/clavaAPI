import { object2stringSimple } from "../../larai/includes/scripts/output.js";

/**
 * @class
 */
export default class OpsCost {
    ops: { [key: string]: number } = {};

    toString() {
        return object2stringSimple(this);
    }

    increment(opsId: string) {
        var currentValue = this.ops[opsId];
        if (currentValue === undefined) {
            this.ops[opsId] = 1;
        } else {
            this.ops[opsId] = currentValue + 1;
        }
    }
}
