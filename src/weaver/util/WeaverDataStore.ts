import Io from "../../lara/Io.js";
import { checkTrue } from "../../lara/LaraCore.js";
import DataStore from "../../lara/util/DataStore.js";

/**
 * DataStore used in LaraI weavers.
 * @constructor
 */
export default class WeaverDataStore extends DataStore {
    constructor(
        data?: DataStore | string | any | undefined,
        definition?: any | undefined
    ) {
        super(
            data !== undefined ? data : "LaraI Options",
            definition !== undefined
                ? definition
                : Java.type(
                      "org.lara.interpreter.joptions.config.interpreter.LaraiKeys"
                  ).STORE_DEFINITION
        );
    }

    /*** PRIVATE OVERRIDABLE FUNCTIONS ***/

    /**
     * Wraps a Java DataStore around a Lara DataStore.
     */
    #dataStoreWrapper(javaDataStore: any) {
        return new WeaverDataStore(javaDataStore, this.definition);
    }

    /*** NEW WEAVER_DATA_STORE FUNCTIONS ***/

    /**
     * @return a number between 0 and 3, representing the verbose level (0 - less information, 3 - more information)
     */
    getVerboseLevel() {
        return this.get("verbose").ordinal();
    }

    /**
     * @param verboseLevel a number between 0 and 3, representing the verbose level (0 - less information, 3 - more information)
     */
    setVerboseLevel(verboseLevel: number) {
        checkTrue(
            verboseLevel >= 0 && verboseLevel <= 3,
            "WeaverDataStore.setVerboseLevel: expected a number  between 0 and 3"
        );

        this.put(
            "verbose",
            Java.type(
                "org.lara.interpreter.joptions.config.interpreter.VerboseLevel"
            ).values()[verboseLevel]
        );
    }

    /**
     * @return a java.io.File representing the current output folder of the weaver
     */
    getOutputFolder() {
        //return this.get(LaraiKeys.OUTPUT_FOLDER);
        return this.get("output");
    }

    /**
     * @param outputFolder a java.io.File or a String, representing the current output folder of the weaver
     *
     */
    setOutputFolder(outputFolder: string) {
        var normalizedOutputFolder = Io.getPath(outputFolder);
        this.put("output", normalizedOutputFolder);
    }

    /**
     *
     */
    setIncludeFolders(includeFolders: any) {
        var fileList = Java.type(
            "org.lara.interpreter.joptions.keys.FileList"
        ).newInstance(includeFolders);
        this.put("include", fileList);
    }

    setTools(toolsPath: any) {
        var toolsFile = Java.type(
            "org.lara.interpreter.joptions.keys.OptionalFile"
        ).newInstance(toolsPath);
        this.put("tools", toolsFile);
    }

    setLogFile(logPath: any) {
        var logFile = Java.type(
            "org.lara.interpreter.joptions.keys.OptionalFile"
        ).newInstance(logPath);
        this.put("log", logFile);
    }

    getLogFile() {
        var optionalFile = this.get("log");
        return optionalFile !== undefined ? optionalFile.getFile() : undefined;
    }
}
