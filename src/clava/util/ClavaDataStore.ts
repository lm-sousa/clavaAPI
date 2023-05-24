import Io from "../../lara/Io.js";
import { arrayFromArgs, checkString } from "../../lara/LaraCore.js";
import WeaverDataStore from "../../weaver/util/WeaverDataStore.js";
import java from "java";

/**
 * DataStore used in Clava.
 * @constructor
 */
export default class ClavaDataStore extends WeaverDataStore {
    constructor(data?: any | undefined, definition?: any | undefined) {
        // Parent constructor
        super(
            data,
            definition !== undefined
                ? definition
                : java
                      .import("pt.up.fe.specs.clava.weaver.CxxWeaver")
                      .getWeaverDefinition()
        );

        // Add alias
        this.addAlias("Disable Clava Info", "disable_info");
    }

    /*** PRIVATE OVERRIDABLE FUNCTIONS ***/

    /**
     * Wraps a Java DataStore around a Lara DataStore.
     */
    #dataStoreWrapper(javaDataStore: any) {
        return new ClavaDataStore(javaDataStore, this.definition);
    }

    /*** NEW CLAVA_DATA_STORE FUNCTIONS ***/

    /**
     * @return {string} a string with the current C/C++ compiler flags.
     */
    getFlags() {
        return this.get("Compiler Flags");
    }

    /**
     * @param {string} flags - A string with C/C++ compiler flags.
     *
     */
    setFlags(flags: string) {
        checkString(flags);

        this.put("Compiler Flags", flags);
    }

    /**
     * @return {J#java.util.List<String>} A list with the current extra system includes.
     */
    getSystemIncludes() {
        return this.get("library includes").getFiles();
    }

    /**
     * @return {J#java.util.List<String>} A list with the current user includes.
     */
    getUserIncludes() {
        return this.get("header includes").getFiles();
    }

    /**
     * @param {string...} arguments - A variable number of strings with the extra system includes.
     *
     */
    setSystemIncludes() {
        var filenames = arrayFromArgs(arguments);
        var files = [];
        for (var filename of filenames) {
            files.push(Io.getPath(filename));
        }

        var fileList = java
            .import("org.lara.interpreter.joptions.keys.FileList")
            .newInstance(files);
        this.put("library includes", fileList);
    }

    /**
     * @param {string...} arguments - A variable number of strings with the user includes.
     *
     */
    setUserIncludes() {
        var filenames = arrayFromArgs(arguments);
        var files = [];
        for (var filename of filenames) {
            files.push(Io.getPath(filename));
        }

        var fileList = java
            .import("org.lara.interpreter.joptions.keys.FileList")
            .newInstance(files);
        this.put("header includes", fileList);
    }

    /**
     * @return {string} a string with the current compilation standard.
     */
    getStandard() {
        return this.get("C/C++ Standard").toString();
    }

    /**
     * @param {string} flags - A string with a C/C++/OpenCL compilation standard.
     *
     */
    setStandard(standard: string) {
        checkString(standard);

        var stdObject = java
            .import("pt.up.fe.specs.clava.language.Standard")
            .getEnumHelper()
            .fromValue(standard);
        this.put("C/C++ Standard", stdObject);
    }
}
