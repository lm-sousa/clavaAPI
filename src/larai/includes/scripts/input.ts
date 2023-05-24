import JavaTypes from "../../../lara/JavaTypes.js";

/**
 * Read an input on the console
 */
export function read(message?: { toString: () => any } | undefined) {
    if (message != undefined) {
        console.log(message.toString());
    }
    const Scanner = JavaTypes.getType("java.util.Scanner");
    var inp = new Scanner("java.lang.System.in");
    return inp.nextLine();
}

/**
 * Read a file
 * @param path
 * @returns
 */
export function readFile(path: string) {
    var file = new JavaTypes.JavaFile(path.toString());
    var content = JavaTypes.SpecsIo.read(file);
    return content;
}

export function fileToJSON(path: string) {
    var content = readFile(path);
    return JSON.parse(content);
}
