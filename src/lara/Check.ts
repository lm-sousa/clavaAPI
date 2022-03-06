import JavaTypes from "./JavaTypes.js";
import { isArray } from "./LaraCore.js";

/**
 * Utility methods to check preconditions.
 *
 * @class
 */
export default class Check {
    /**
     * Throws an exception if the given expression evaluates to false.
     */
    static isTrue(
        booleanExpr: boolean,
        message?: string | undefined,
        source?: string | undefined
    ) {
        if (!booleanExpr) {
            if (message === undefined) {
                message = "Check.isTrue failed";
            }

            if (source !== undefined) {
                message = source + ": " + message;
            }

            throw message;
        }
    }

    /**
     * @return {boolean} true if the given value is either undefined or null.
     */
    static isUndefined(value: any) {
        return value === undefined || value === null;
    }

    /**
     * @param value
     * @param varName
     * @param source
     */
    static isDefined(value: any, message?: string | undefined) {
        if (!Check.isUndefined(value)) {
            return;
        }

        // Undefined, throw exception
        if (message === undefined) {
            message = "Value is undefined";
        }

        throw message;
    }

    static instance(
        value: any,
        type: any,
        source: string,
        userTypeName: string
    ) {
        if (typeof type !== "function") {
            throw "Check.instance: parameter type must be a function";
        }

        if (value instanceof type) {
            return;
        }

        // Try to get name from type
        var typeName = type.name;

        // If no name, try to use user type name
        if (typeName === undefined || typeName.length === 0) {
            typeName = userTypeName;
        }

        // If still undefined, add placeholder
        if (typeName === undefined) {
            typeName = "<could not determine>";
        }

        var valueName = value.constructor.name;
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

    static type(value: any, type: string, source?: string) {
        if (typeof type !== "string") {
            throw "Check.type: parameter type must be a string";
        }

        if (typeof value === type) {
            return;
        }

        // Special case: array
        if (type === "array" && isArray(value)) {
            return;
        }

        // Special case: regex
        if (type === "regex" && value instanceof RegExp) {
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

    static isBoolean(variable: any, source?: string) {
        Check.type(variable, "boolean", source);
    }

    static isString(variable: any, source?: string) {
        Check.type(variable, "string", source);
    }

    static isNumber(variable: any, source?: string) {
        Check.type(variable, "number", source);
    }

    static isArray(variable: any, source?: string) {
        Check.type(variable, "array", source);
    }

    static isRegex(variable: any, source?: string) {
        Check.type(variable, "regex", source);
    }

    /**
     * Checks if the given value is a join point. If a type is given, checks if the join point is an instance of the given type. Otherwise, throws an exception.
     *
     * @param {$jp} $jp
     * @param {string} [type=undefined]
     * @param {boolean} [isOptional=false] - If true, passes check if value is undefined
     */
    static isJoinPoint(
        $jp: any,
        type?: any | undefined,
        isOptional: boolean = false
    ) {
        if (isOptional && $jp === undefined) {
            return;
        }

        if (!JavaTypes.JoinPoint.isJoinPoint($jp)) {
            throw (
                "Expected variable to be of type join point, but it is of type '" +
                typeof $jp +
                "'"
            );
        }

        if (type !== undefined && !$jp.instanceOf(type)) {
            throw (
                "Expected join point to be an instance of type '" +
                type +
                "' but its type is '" +
                $jp.joinPointType +
                "'"
            );
        }
    }

    /**
     * Checks if two strings are identical, not considering empty spaces. Throws and exception if strings do not match.
     */
    static strings(currentString: string, expectedString: string) {
        // Normalize both strings
        currentString = JavaTypes.SpecsStrings.normalizeFileContents(
            currentString.toString(),
            true
        );
        expectedString = JavaTypes.SpecsStrings.normalizeFileContents(
            expectedString.toString(),
            true
        );

        if (currentString !== expectedString) {
            throw (
                "Current result does not match expected result. Diff:\n" +
                Check.diff(expectedString, currentString)
            );
        }
    }

    /**
     * @param {Object} original - The original text
     * @param {Object} revised - The revised text
     */
    static diff(original: string, revised: string) {
        return JavaTypes.JavaDiff.getDiff(
            original.toString(),
            revised.toString()
        );
    }

    /**
     * Checks if the array contains the element. Throws an expression if it doens't.
     * The test is equivalent to array.indexOf(element) != -1.
     */
    static arrayContains(
        array: any[],
        element: any,
        message?: string | undefined,
        source?: string | undefined
    ) {
        if (array.indexOf(element) == -1) {
            if (message === undefined) {
                message = "Check.arrayContains failed";
            }

            if (source !== undefined) {
                message = source + ": " + message;
            }

            throw message;
        }
    }
}
