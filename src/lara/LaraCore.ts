import { object2string, println } from "../larai/includes/scripts/output";
import Weaver from "../weaver/Weaver";
import JavaTypes from "./JavaTypes";

export var LARA_DEBUG = false;

export function setDebug(value: any) {
    if (value === undefined) {
        LARA_DEBUG = true;
        return;
    }

    LARA_DEBUG = value;
}

export function isDebug() {
    return LARA_DEBUG;
}

export function notImplemented(functionName: string) {
    functionName = defaultValue(functionName, "<unknown>");

    throw (
        "Function " +
        functionName +
        " not implemented yet for this weaver implementation"
    );
}

/**
 * Returns the value if defined or the provided default value. This useful for optional parameters of functions.
 *
 * @param {any} value - the original value
 * @param {any} defaultValue - the default value
 * */
export function defaultValue(value: any, defaultValue: any) {
    return value === undefined ? defaultValue : value;
}

/**
 * Temporary method that returns true if the given value is undefined or null,
 * to be used while WeaverGenerator does not support returning undefined from Java.
 */
export function isUndefined(value: any) {
    return value === undefined || value === null;
}

/**
 * Throws an exception if the given expression evaluates to false.
 */
export function checkTrue(
    booleanExpr: boolean,
    message: string | undefined,
    source?: string | undefined
) {
    if (!booleanExpr) {
        if (message === undefined) {
            message = "checkTrue failed";
        }

        if (source !== undefined) {
            message = source + ": " + message;
        }

        throw message;
    }
}

export function checkDefined(
    value: any,
    varName?: string | undefined,
    source?: string | undefined
) {
    if (!isUndefined(value)) {
        return;
    }

    // Undefined, throw exception
    var message = "Value ";
    if (varName !== undefined) {
        message += varName + " ";
    }
    if (source !== undefined) {
        message = source + ": " + message;
    }
    message += "is undefined";

    throw message;
}

// TODO: type should be a JP
export function checkInstance(
    value: any,
    type: any,
    source: string,
    userTypeName: string
) {
    if (value instanceof type) {
        return;
    }

    // Try to get name from type
    var typeName = type.class;

    // If no name, try to use user type name
    if (typeName === undefined || typeName.length === 0) {
        typeName = userTypeName;
    }

    // If still undefined, add placeholder
    if (typeName === undefined) {
        typeName = "<could not determine>";
    }

    var valueName = value.getClass().getName();
    if (valueName.length === 0) {
        valueName = undefined;
    }

    var message = "Expected value to be of type '" + typeName + "'";

    if (valueName !== undefined) {
        message += ", but is of type '" + valueName + "'";
    } else {
        message +=
            ", but is of another type. The code of the constructor function is:\n" +
            value.constructor;
    }

    if (source !== undefined) {
        message = source + ": " + message;
    }

    throw message;
}

export function checkType(
    value: any,
    type: string,
    source?: string | undefined
) {
    if (typeof type !== "string") {
        throw "checkType: parameter type must be a string";
    }

    if (typeof value === type) {
        return;
    }

    // Special case: array
    if (type === "array" && isArray(value)) {
        return;
    }

    var message =
        "Expected value to be of type '" +
        type +
        "', but is of type '" +
        typeof value +
        "'";

    if (source !== undefined) {
        message = source + ": " + message;
    }

    throw message;
}

export function checkBoolean(variable: any, source: string) {
    checkType(variable, "boolean", source);
}

export function checkString(variable: any, source?: string | undefined) {
    checkType(variable, "string", source);
}

export function checkNumber(variable: any, source: string) {
    checkType(variable, "number", source);
}

export function checkArray(variable: any, source: string) {
    checkType(variable, "array", source);
}

export function isJoinPoint($jp: any, type?: any | undefined): boolean {
    return Weaver.isJoinPoint($jp, type);
}

export function checkJoinPoint($jp: any, source?: string | undefined) {
    if (isJoinPoint($jp)) {
        return;
    }

    var message =
        "Expected variable to be of type join point, but it's of type '" +
        typeof $jp +
        "'";

    if (source !== undefined) {
        message = source + ": " + message;
    }

    throw message;
}

export function checkJoinPointType(
    $jp: any,
    type: string,
    source: string | undefined
) {
    checkJoinPoint($jp, source);

    if (isJoinPoint($jp, type)) {
        return;
    }

    var message =
        "Expected variable to be a join point of type '" +
        type +
        "', but it's of type '" +
        $jp.joinPointType +
        "'";
    if (source !== undefined) {
        message = source + ": " + message;
    }

    throw message;
}

export function isString(variable: any) {
    return typeof variable === "string";
}

export function isObject(variable: any) {
    return typeof variable === "object";
}

/**
 * @param {*} variable
 */
export function isFunction(variable: any) {
    return variable instanceof Function;
}

/**
 * @param {*} variable
 * @param {string} [javaClassname = java.lang.Object]
 *
 * @return {boolean} true if the given object is an instance of the given Java class name
 */
export function isJavaClass(variable: any, javaClassname?: string | undefined) {
    if (javaClassname === undefined) {
        javaClassname = "java.lang.Object";
    }

    return Java.type("pt.up.fe.specs.util.SpecsSystem").isInstance(
        javaClassname,
        variable
    );
}

export function toArray(objectWithLength: { [x: string]: any }) {
    var newArray = [];
    for (var index in objectWithLength) {
        newArray.push(objectWithLength[index]);
    }

    return newArray;
}

export function info(message: string, origin?: string | undefined) {
    var composedMessage = message;

    if (origin !== undefined) {
        composedMessage = origin + ": " + composedMessage;
    }

    println(composedMessage);
}

/**
 * @param {string|Function} message - The message to print. Accepts functions, that are only evaluated if debug information is enabled. Use functions if the debug message can include expensive processing.
 */
export function debug(message: string | Function, origin?: string | undefined) {
    if (LARA_DEBUG) {
        let processedMessage = message;
        if (message instanceof Function) {
            processedMessage = message();
        }
        info("[DEBUG] " + processedMessage, origin);
    }
}

export function debugObject(object: any, origin?: string | undefined) {
    if (LARA_DEBUG) {
        var lines = object2string(object).split("\n");
        info("[DEBUG] " + lines.join("\n[DEBUG] " + origin));
    }
}

/**
 * Converts an arguments object to a JavaScript array (Array).
 *
 * If there is a single argument after the start index and that argument is an array, that array will be returned.
 *
 * @args {Arguments} args  - The original arguments object.
 * @args {Number} [start=0] - The index where we begin the conversion (inclusive).
 * */
export function arrayFromArgs(
    args: string | IArguments | any[],
    start?: number | undefined
) {
    checkDefined(args, "args", "LaraCore arrayFromArgs");

    if (start === undefined || start < 0) {
        start = 0;
    }

    // If only one element and is already an array, just return the array
    if (args.length === start + 1 && isArray(args[start])) {
        return args[start];
    }

    if (args.length === start + 1 && isJavaList(args[start])) {
        return toArray(args[start]);
    }

    return Array.prototype.slice.call(args, start);
}

/**
 * @return true if the given value is an array, false otherwise
 */
export function isArray(value: any) {
    return value instanceof Array;
}

/**
 * Adds the elements of an array into another array.
 */
export function pushArray(receivingArray: Array<any>, sourceArray: Array<any>) {
    for (var index in sourceArray) {
        receivingArray.push(sourceArray[index]);
    }
}

export function isJavaList(list: any) {
    return list instanceof Java.type("java.util.List");
}

/*
 * Custom getter that is used as a compatibility layer between JS properties and Java methods.
 *
 * The name of this functions must be the same as the value of the field org.lara.interpreter.weaver.interf.JoinPoint.LARA_GETTER .
 */
export function laraGetter(object: any, property: string) {
    var value = object[property];
    var type = typeof value;

    // If type is function, assume it should be called without arguments
    if (type === "function") {
        // Java object
        if (isJavaClass(object) && !isUndefined(object.class)) {
            // Special case: property 'class'
            if (property === "class") {
                return object.class;
            }

            return Java.type("pt.up.fe.specs.util.SpecsSystem").invokeAsGetter(
                object,
                property
            );
        }

        // JS object
        return value;
    }

    return value;
}

export function jpGetter(object: any, property: string) {
    // If not a Java object, treat it as a normal JS object
    if (!isJavaClass(object)) {
        return object[property];
    }

    // Special case: property 'class'
    if (property === "class") {
        return object.class;
    }

    return Java.type("pt.up.fe.specs.util.SpecsSystem").invokeAsGetter(
        object,
        property
    );
}

export function stringReplacer(
    string: string,
    oldSequence: string | RegExp,
    newSequence: string
) {
    return string.replace(oldSequence, newSequence);
}

export function exit() {
    throw "function 'exit()' has been deprecated. Please use another way of stoping the script (e.g., by returning)";
}

/**
 * @return an array with the keys of an object
 */
export function getKeys(object: { [x: string]: any }) {
    var keys = [];

    for (var key in object) {
        keys.push(key);
    }

    return keys;
}

/**
 * @return an array with the values of an object
 */
export function getValues(object: { [x: string]: any }) {
    var values = [];

    for (var key in object) {
        values.push(object[key]);
    }

    return values;
}

/**
 * Acts as a constructor where you can pass the arguments object.
 *
 * @return the constructed object, of the constructor if it could not be built.
 */
export function newObject(aClass: any, args: any[]) {
    var obj = Object.create(aClass.prototype);
    return aClass.apply(obj, args) || obj;
}

/**
 * Function to call aspects, returns the aspect with the results.
 */
export function callAspect(aspect: any) {
    var aspectObj = newObject(aspect, Array.prototype.slice.call(arguments, 1));
    aspectObj.call();
    return aspectObj;
}

export var _LARA_IMPORT_LOADED: { [key: string]: boolean } = {};

export function laraImport(importName: string) {
    checkString(importName, "laraImport (LaraCore.js)");

    // Return if already loaded
    if (_LARA_IMPORT_LOADED[importName] !== undefined) {
        debug(
            () =>
                "laraImport: import " +
                importName +
                " already processed, ignoring"
        );
        return;
    }

    // Import
    _LARA_IMPORT_LOADED[importName] = true;
    debug(() => "laraImport: importing " + importName);
    JavaTypes.LaraI.loadLaraImport(importName);
}
