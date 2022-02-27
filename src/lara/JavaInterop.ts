import { checkDefined, checkString } from "./LaraCore";

/**
 * @class
 */
export default class JavaInterop {
    /**
     * 		Converts a JS array into a java.util.List.
     **/
    static arrayToList(array: Array<any>) {
        var ArrayListClass = Java.type("java.util.ArrayList");
        var list = new ArrayListClass();

        for (var index in array) {
            var element = array[index];
            list.add(element);
        }

        return list;
    }

    /**
     * 		Converts a JS array into a java.util.List where all objects are Strings.
     **/
    static arrayToStringList(array: Array<any>) {
        return JavaInterop.arrayToList(array.map((value) => value.toString()));
    }

    /**
     * @param {object} value - value to test
     * @param {String} classname - the full qualified name of the Java class of the value
     */
    static isInstance(value: any, classname: string) {
        checkDefined(value);
        checkString(classname);

        return value instanceof Java.type(classname);
    }

    static isList(value: any) {
        return JavaInterop.isInstance(value, "java.util.List");
    }

    static getClass(classname: string) {
        checkString(classname);

        return Java.type(classname).class;
    }
}
