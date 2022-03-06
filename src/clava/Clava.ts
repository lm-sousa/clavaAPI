import Io from "../lara/Io.js";
import Check from "../lara/Check.js";
import JavaInterop from "../lara/JavaInterop.js";
//import clava.ClavaAspects;
import ClavaDataStore from "./util/ClavaDataStore.js";
import WeaverOptions from "../weaver/WeaverOptions.js";
import Weaver from "../weaver/Weaver.js";
import Query from "../weaver/Query.js";
import { println } from "../larai/includes/scripts/output.js";
import { info } from "../lara/LaraCore.js";

const CxxWeaverApi = Java.type("pt.up.fe.specs.clava.weaver.CxxWeaverApi");
const ClavaWeaverLauncher = Java.type(
    "pt.up.fe.specs.clava.weaver.ClavaWeaverLauncher"
);
const AstFactory = Java.type(
    "pt.up.fe.specs.clava.weaver.importable.AstFactory"
);
const ArgumentsParser = Java.type(
    "pt.up.fe.specs.util.parsing.arguments.ArgumentsParser"
);

/**
 * @class
 */
export default class Clava {
    /**
     * Enables/disables library SpecsLogger for printing.
     * <p>
     * By default, is disabled.
     */
    static useSpecsLogger = false;

    /**
     * Returns the standard being used for compilation.
     */
    static getStandard() {
        return Clava.getProgram().standard;
    }

    static isCxx() {
        return Clava.getProgram().isCxx;
    }

    static rebuild() {
        return Clava.getProgram().rebuild();
    }

    static rebuildFuzzy() {
        return Clava.getProgram().rebuildFuzzy();
    }

    /**
     * @return {J#java.io.File} The folder of the first input source element, either itself, if a folder, or the parent folder, if it is a file.
     */
    static getBaseFolder() {
        return Clava.getProgram().baseFolder;
    }

    /**
     * @return {J#java.io.File} The folder where the code represented by the AST will be written at the end of execution.
     */
    static getWeavingFolder() {
        return Clava.getProgram().weavingFolder;
    }

    /**
     * @param {$file} $file The file to add to the AST.
     */
    static addFile($file: any) {
        if (!$file.instanceOf("file")) {
            println(
                "Clava.addFile: Input must be a 'file' join point, it is a '" +
                    $file.joinPointType +
                    "'"
            );
            return;
        }
        Clava.getProgram().addFile($file);
    }

    /**
     * @param {J#java.io.File|string} path Path to an existing source file that will be added to the AST. If the file does not exists, throws an exception.
     */
    static addExistingFile(path: string) {
        var file = Io.getPath(path);

        if (!file.isFile()) {
            throw new Error(
                "Clava.addExistingFile(): path " +
                    path +
                    " does not represent an existing file"
            );
        }

        var $file = AstFactory.file(file.getAbsolutePath(), "");
        Clava.addFile($file);
    }

    static cLinkageBegin() {
        return `
#ifdef __cplusplus
extern "C" {
#endif`;
    }

    static cLinkageEnd() {
        return `#ifdef __cplusplus
}
#endif`;
    }

    /**
     * Launches a Clava weaving session.
     * @param {(string|Array)} args - The arguments to pass to the weaver, as if it was launched from the command-line
     * @return {Boolean} true if the weaver execution without problems, false otherwise
     */
    static runClava(args: string | any[]) {
        // If string, separate arguments
        if (typeof args === "string") {
            args = ArgumentsParser.newCommandLine().parse(args);
        }

        return ClavaWeaverLauncher.execute(args);
    }

    /**
     * Launches several Clava weaving sessions in parallel.
     *
     * @param {string[][]} argsLists - An array where each element is an array with the arguments to pass to the weaver, as if it was launched from the command-line
     * @param {int} [threads = -1] -  Number of threads to use
     * @param {string[]|string} [clavaCommand = []] -  The command we should use to call Clava (e.g., /usr/local/bin/clava)
     *
     * @return {Boolean} true if none of the weaver executions had problems, false otherwise
     */
    static runClavaParallel(
        argsLists: string[][],
        threads: number,
        clavaCommand: string[] | string
    ) {
        if (threads === undefined) {
            threads = -1;
        }

        if (clavaCommand === undefined) {
            clavaCommand = ["clava"];
        }

        if (!(clavaCommand instanceof Array)) {
            clavaCommand = [clavaCommand.toString()];
        }

        // Assures all elements in the argsLists are String
        var safeArgsLists = [];
        for (var argsList of argsLists) {
            safeArgsLists.push(argsList.map((value) => value.toString()));
        }

        var jsonStrings = ClavaWeaverLauncher.executeParallel(
            safeArgsLists,
            threads,
            JavaInterop.arrayToStringList(clavaCommand),
            Clava.getData().getContextFolder().getAbsolutePath()
        );

        // Read each json file into its own object
        var results = [];

        for (var jsonString of jsonStrings) {
            results.push(JSON.parse(jsonString));
        }

        return results;
    }

    /**
     * Creates a clone of the current AST and pushes the clone to the top of the current AST stack. If a $program join point is passed, that join point is added to the top of the stack instead.
     *
     * @param {$program} [$program = undefined] program to push to the AST.
     */
    static pushAst($program?: any) {
        if ($program === undefined) {
            Clava.getProgram().push();
            return;
        }

        Check.isJoinPoint($program, "program");
        Weaver.getWeaverEngine().pushAst($program.node);
    }

    /**
     * Discards the AST at the top of the current AST stack.
     */
    static popAst() {
        Clava.getProgram().pop();
    }

    /**
     * The current number of elements in the AST stack.
     */
    static getStackSize() {
        return Weaver.getWeaverEngine().getStackSize();
    }

    /**
     * Looks for a join point in the current AST.
     *
     * @param $jp a join point from any AST
     * @return the equivalent join point from the AST at the top of the current AST stack
     */
    static findJp($jp: any) {
        // Get file
        const $file = $jp.ancestor("file");
        if ($file === undefined) {
            info("Could not find a file for '" + $jp + "'", "Clava.findJp");
            return undefined;
        }

        var $newJp = CxxWeaverApi.findJp($file.filepath, $jp.astId);
        if ($newJp === null) {
            info(
                "Could not find the given '" +
                    $jp +
                    "' in the current AST. Please verify if a rebuild was done",
                "Clava.findJp"
            );
            return undefined;
        }

        return $newJp;
    }

    /**
     * Writes the code of the current AST to the given folder.
     */
    static writeCode(outputFoldername: string) {
        var outputFolder = Io.mkdir(outputFoldername);

        CxxWeaverApi.writeCode(outputFolder);

        return outputFolder;
    }

    /**
     * @return DataStore with the data of the current weaver
     */
    static getData() {
        return new ClavaDataStore(WeaverOptions.getData());
    }

    /**
     * @return the join point $program.
     */
    static getProgram() {
        return Query.searchFromInclusive(Query.root(), "program").first();
    }

    /**
     *
     * @return {J#List<include>} a list of join points representing available user includes
     */
    static getAvailableIncludes() {
        return CxxWeaverApi.getAvailableUserIncludes();
    }

    /**
     *
     * @return {J#Set<String>} a set with paths to the include folders of the current configuration.
     */
    static getIncludeFolders() {
        return CxxWeaverApi.getIncludeFolders();
    }
}
