import { checkType, isJoinPoint } from "./LaraCore.js";
import java from "java";

const LaraExtraApiTools = java.import("pt.up.fe.specs.lara.LaraExtraApiTools");

/**
 * @class
 */
export default class MathExtra {
    /**
     * Attempts to simplify a mathematical expression.
     *
     * @param {string|$jp} expression - The expression to simplify.
     * @param {object} constants - An object that maps variable names to constants.
     *
     * @returns {string} simplified expression
     */
    static simplify(expression: string | any, constants: any) {
        if (isJoinPoint(expression)) {
            expression = expression.code;
        }

        checkType(expression, "string", "MathExtra.simplify(), expression");

        var HashMap = java.import("java.util.HashMap");
        var map = new HashMap();

        if (constants !== undefined) {
            for (var p in constants) {
                map.put(p, constants[p]);
            }
        }

        return LaraExtraApiTools.simplifyExpression(expression, map);
    }

    /**
     * Attempts to convert a mathematical expression to valid C code (e.g., converts ^ to a call to pow()).
     *
     * @param {string|$jp} expression - The expression to simplify.
     *
     * @returns {string} simplified expression as C code
     */
    static convertToC(expression: string | any) {
        return LaraExtraApiTools.convertToC(expression);
    }

    /**
     * Attempts to simplify a mathematical expression, returning a string that represents C code.
     *
     * @param {string|$jp} expression - The expression to simplify.
     * @param {object} constants - An object that maps variable names to constants.
     *
     * @returns {string} simplified expression as C code
     */
    static simplifyToC(expression: string | any, constants: any) {
        var simplifiedExpr = MathExtra.simplify(expression, constants);
        return MathExtra.convertToC(simplifiedExpr);
    }
}
