import { object2stringSimple } from "../../larai/includes/scripts/output";
import OpsCost from "./OpsCost";

/**
 * @class
 */
export default class OpsBlock {
    id: string;
    cost: OpsCost;
    nestedOpsBlocks: OpsBlock[] = [];
    repetitions: number;
    //isRecursive = false;

    constructor(id: string) {
        this.id = id;
        this.cost = new OpsCost();
        this.nestedOpsBlocks = [];
        this.repetitions = 1;
        //this.isRecursive = false;
    }

    toString() {
        return object2stringSimple(this);
    }

    add(opsId: string) {
        this.cost.increment(opsId);
    }
}
