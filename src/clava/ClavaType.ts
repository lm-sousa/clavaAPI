import ClavaJavaTypes from "./ClavaJavaTypes.js";
import JoinPoints from "../weaver/JoinPoints.js";
import Check from "../lara/Check.js";
import ClavaJoinPoints from "./ClavaJoinPoints.js";
import { isString } from "../lara/LaraCore.js";

/**
 * Utility methods related with the type join points.
 *
 * @class
 */
export default class ClavaType {
    /**
     * @param type the type to visit
     * @param exprFunction a function that receives an $expr join point
     *
     * @return the $type after applying the given exprFunction to its $expr nodes. If any of the fields of the type is visited, a copy of the type is returned.
     */
    static visitExprInTypeCopy(
        $type: any,
        exprFunction: { ($expr: any): void; (arg0: any): void }
    ) {
        if ($type.instanceOf("pointerType")) {
            var $typeCopy = $type.copy();
            $typeCopy.pointee = ClavaType.visitExprInTypeCopy(
                $typeCopy.pointee,
                exprFunction
            );
            return $typeCopy;
        }

        if ($type.instanceOf("parenType")) {
            var $typeCopy = $type.copy();
            $typeCopy.desugar = ClavaType.visitExprInTypeCopy(
                $typeCopy.desugar,
                exprFunction
            );
            return $typeCopy;
        }

        if ($type.instanceOf("variableArrayType")) {
            var $typeCopy = $type.copy();
            $typeCopy.sizeExpr = $typeCopy.sizeExpr.copy();
            exprFunction($typeCopy.sizeExpr);
            return $typeCopy;
        }

        return $type;
    }

    /**
     * @param type a type join point that will be visited looking for $expr join points. Any visited nodes in the type (e.g., desugar) will be copied, so that the returned varrefs can be safely modified.
     * @param varrefs an array (possibly empty) where the $varref join points found in the given type will be stored
     *
     * @return a copy of the given $type, to which the varrefs refer to
     */
    static getVarrefsInTypeCopy($type: any, varrefs: any[]) {
        var exprFunction = function ($expr: any) {
            for (var $varref of $expr.descendantsAndSelf("varref")) {
                varrefs.push($varref);
            }
        };

        return ClavaType.visitExprInTypeCopy($type, exprFunction);
    }

    /**
     *  Makes sure the given parameter is an expression join point.
     *
     * @param {String|$expr} $expression - If a string, returns a literal expression with the code of the string. Otherwise, returns $expression
     * @param {boolean} [isOptional=false] - If false and $expression is undefined, throws an exception. Otherwise, returns undefined if $expression is undefined.
     */
    static asExpression($expression: any, isOptional: boolean = false) {
        if (isOptional === undefined) {
            isOptional = false;
        }

        if ($expression === undefined) {
            if (isOptional) {
                return undefined;
            } else {
                throw "ClavaType.asExpression: $expression is undefined. If this is allowed, set 'isOptional' to true.";
            }
        }

        if (isString($expression)) {
            return ClavaJoinPoints.exprLiteral($expression);
        }

        Check.isJoinPoint($expression, "expression");
        return $expression;
    }

    /**
     *  Makes sure the given parameter is a statement join point.
     *
     * @param {String|$jp} code - If a string, returns a literal statement with the code of the string. Otherwise, tries to transform the given node to a $statement
     * @param {boolean} [isOptional=false] - If false and code is undefined, throws an exception. Otherwise, returns undefined if code is undefined.
     */
    static asStatement(code: string | any, isOptional: boolean = false) {
        if (isOptional === undefined) {
            isOptional = false;
        }

        if (code === undefined) {
            if (isOptional) {
                return undefined;
            } else {
                throw "ClavaType.asStatement: code is undefined. If this is allowed, set 'isOptional' to true.";
            }
        }

        if (isString(code)) {
            return ClavaJoinPoints.stmtLiteral(code);
        }

        // Check that code is a join point
        Check.isJoinPoint(code);

        var newStmtNode = ClavaJavaTypes.ClavaNodes.toStmt(code.node);

        return JoinPoints.getInstance().toJoinPoint(newStmtNode);
    }

    /**
     *  Makes sure the given parameter is a type join point.
     *
     * @param {String|$type} $type - If a string, returns a literal type with the code of the string. Otherwise, returns $type
     */
    static asType($type: string | any) {
        if (isString($type)) {
            return ClavaJoinPoints.typeLiteral($type);
        }

        Check.isJoinPoint($type, "type");
        return $type;
    }

    /**
     *  Makes sure the given parameter is a scope join point.
     *
     * @param {String|$jp} code - If a string, returns a literal statement with the code of the string. Otherwise, returns $statement
     * @return {$scope}
     */

    static asScope(code: string | any) {
        if (code === undefined) {
            return undefined;
        }

        // Covert code to a statement
        var $newStmt = ClavaType.asStatement(code);

        var newScopeNode = ClavaJavaTypes.ClavaNodes.toCompoundStmt(
            $newStmt.node
        );

        return JoinPoints.getInstance().toJoinPoint(newScopeNode);
    }
}
