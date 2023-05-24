import StringSet from "../../lara/util/StringSet.js";
import ClavaJoinPoints from "../ClavaJoinPoints.js";

/**
 * Adds and manages global variables.
 */
export default class GlobalVariable {
    #filesWithGlobal: StringSet;
    #varName: string;
    #$type: any;
    #initValue: string;

    constructor(varName: string, $type: any, initValue: string) {
        this.#filesWithGlobal = new StringSet();
        this.#varName = varName;
        this.#$type = $type;
        this.#initValue = initValue.toString();
    }

    /**
     * @return {$varref} - A reference to the global variable defined by this object.
     */
    getRef($reference: any) {
        // Check file for the reference point
        var $file = $reference.ancestor("file");
        if ($file === undefined) {
            console.log(
                "GlobalVariable.getRef: Could not find the file for the reference point " +
                    $reference.location
            );
            return undefined;
        }

        // Check if file already has this global variable declared
        var fileId = $file.jpId;
        if (!this.#filesWithGlobal.has(fileId)) {
            this.#filesWithGlobal.add(fileId);
            $file.addGlobal(this.#varName, this.#$type, this.#initValue);
        }

        // Create varref
        return ClavaJoinPoints.varRef(this.#varName, this.#$type);
    }
}
