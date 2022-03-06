import Clava from "./Clava.js";
import JoinPoints from "../weaver/JoinPoints.js";
import Check from "../lara/Check.js";
import ClavaJavaTypes from "./ClavaJavaTypes.js";
import ClavaType from "./ClavaType.js";
import { checkDefined, isJoinPoint, isString } from "../lara/LaraCore.js";

const AstFactory = Java.type(
    "pt.up.fe.specs.clava.weaver.importable.AstFactory"
);

/**
 * Utility methods related with the creation of new join points.
 *
 * @class
 */
export default class ClavaJoinPoints {
    /**
     * @param {J#ClavaNode} node - A node of the AST.
     * @deprecated use JoinPoints.getInstance().toJoinPoint(node)
     */
    static create(node: any) {
        JoinPoints.getInstance().toJoinPoint(node);
    }

    /**
     * @return true, if the two join points are equal, in the sense that the underlying AST nodes are also equal, according to their .equals() method (might return true for different AST nodes).
     */
    static equals(jp1: any, jp2: any) {
        return jp1.equals(jp2);
    }

    static builtinType(code: string) {
        return AstFactory.builtinType(code);
    }

    static pointerFromBuiltin(code: string) {
        Check.isString(code);
        return AstFactory.pointerTypeFromBuiltin(code);
    }

    static pointer($type: any) {
        Check.isJoinPoint($type, "type");
        return AstFactory.pointerType($type);
    }

    /**
     * Builds an array type of constant dimensions.
     *
     * type - Mandatory. Represents the inner type of the array. Can be either a string or a Type join point. A string will be converted to a literal type.
     * dims - Mandatory. Represents the dimensions of the array. Can be either a JavaScript array or variadic integers which are converted to a JavaScript array.
     **/
    static constArrayType(type: string | any, ...dims: number[]) {
        checkDefined(type, "type", "CustomClavaJoinPoints.constArrayType");
        checkDefined(dims, "dims", "CustomClavaJoinPoints.constArrayType");

        if (Array.isArray(dims[0])) {
            dims = dims[0];
        }

        if (typeof type === "string") {
            return AstFactory.constArrayType(type, Clava.getStandard(), dims);
        } else if (
            Java.type(
                "pt.up.fe.specs.clava.weaver.joinpoints.types.CxxType"
            ).class.isInstance(type)
        ) {
            return AstFactory.constArrayType(
                type.getNode(),
                Clava.getStandard(),
                dims
            );
        } else {
            throw 'CustomClavaJoinPoints.constArrayType: illegal argument "type", needs to be either a string or a type join point';
        }
    }

    static variableArrayType($type: any, $sizeExpr: any) {
        checkDefined($type, "$type", "CustomClavaJoinPoints.variableArrayType");
        checkDefined(
            $sizeExpr,
            "$sizeExpr",
            "CustomClavaJoinPoints.variableArrayType"
        );

        return AstFactory.variableArrayType($type, $sizeExpr);
    }

    static exprLiteral(code: string, type?: any) {
        var typeofType = typeof type;

        if (type === undefined) {
            return AstFactory.exprLiteral(code);
        }

        if (typeofType === "string") {
            type = ClavaJoinPoints.builtinType(type);
        }

        return AstFactory.exprLiteral(code, type);
    }

    /**
     *
     * @param {Type} type The type of the constructed object
     * @param  {...string|joinpoint} constructorArguments Arguments passed to the constructor function
     * @returns
     */
    static cxxConstructExpr(
        type: any,
        ...constructorArguments: string[] | any[]
    ) {
        //constructorArguments = [...constructorArguments];
        constructorArguments = constructorArguments.map((arg: string | any) => {
            if (isString(arg)) {
                return ClavaJoinPoints.exprLiteral(arg);
            } else if (isJoinPoint(arg)) {
                return arg;
            }

            throw new Error(
                `Constructor argument '${arg}' is of unsupported type.`
            );
        });
        return AstFactory.cxxConstructExpr(type, constructorArguments);
    }

    /**
     * @param {string} varName
     * @param {joinpoint} init
     * */
    static varDecl(varName: string, init: any) {
        return AstFactory.varDecl(varName, init);
    }

    /**
     * @param {string} varName
     * @param {Type} type
     * */
    static varDeclNoInit(varName: string, type: any) {
        return AstFactory.varDeclNoInit(varName, type);
    }

    /**
     * Creates a new literal join point 'type'.
     *
     * @param {string} typeString The literal code of the type
     */
    static typeLiteral(typeString: string) {
        return AstFactory.typeLiteral(typeString);
    }

    /**
     * Creates a new join point 'file'.
     *
     * @param {string|J#java.io.File} filename - Name of the source file. If filename represents a path to an already existing file, literally adds the contents of the file to the join point.
     * @param {string} [path=""] The path of the new file, relative to the output folder. Absolute paths are not allowed. This path will be required when including the file (e.g., #include "<path>/<filename>")
     */
    static file(filename: string | any, path?: string) {
        if (path === undefined) {
            path = "";
        }

        return AstFactory.file(filename, path);
    }

    /**
     * @param {String} filename - Name of the source file.
     * @param {String} source - The contents of the source file.
     * @param {String} [path=""] - The path of the new file, relative to the output folder. Absolute paths are not allowed. This path will be required when including the file (e.g., #include "<path>/<filename>")
     */
    static fileWithSource(filename: string, source: string, path: string) {
        Check.isDefined(filename);
        Check.isDefined(source);

        filename = filename.toString();
        source = source.toString();
        path = path !== undefined ? path.toString() : "";

        return AstFactory.file(filename, source, path);
    }

    /**
     * Creates a new literal join point 'stmt'.
     *
     * @param {string} stmtString The literal code of the statement.
     */
    static stmtLiteral(stmtString: string) {
        return AstFactory.stmtLiteral(stmtString);
    }

    /**
     * Creates a new join point 'call'.
     *
     * @param {$function} $function - The function for which the call will refer to.
     * @param {...$expression} arguments - The arguments of the function.
     */
    static call($function: any, ...callArguments: any[]) {
        return AstFactory.callFromFunction($function, callArguments);
    }

    /**
     * Creates a new join point 'call'.
     *
     * @param {string} functionName - The name of the function to call.
     * @param {$type} $returnType - The return type of the function.
     * @param {...$expression} arguments - The arguments of the function.
     */
    static callFromName(
        functionName: string,
        $returnType: any,
        ...callArguments: any[]
    ) {
        return AstFactory.call(functionName, $returnType, callArguments);
    }

    /**
     * Creates a new join point 'switch'
     *
     * @param {$function} $function - The literal code of the statement.
     * @param {...$expression} cases - An even number of expression join points, each pair representing the case value and expression, respectively.
     */
    static switchStmt($conditionExpr: any, ...cases: any[]) {
        return AstFactory.switchStmt($conditionExpr, cases);
    }

    static omp(directiveName: string) {
        return AstFactory.omp(directiveName);
    }

    static scope($stmts: any[]) {
        if ($stmts === undefined) {
            return AstFactory.scope();
        }

        return AstFactory.scope($stmts);
    }

    /**
     * @param {String|$vardecl} decl - The name of the varref.
     * @param {$type} $type - The type of the varref (only used of decl is a string).
     */
    static varRef(decl: string | any, $type?: any) {
        if (isString(decl)) {
            Check.isJoinPoint($type);

            return AstFactory.varref(decl, $type);
        }

        if (isJoinPoint(decl)) {
            return AstFactory.varref(decl);
        }

        throw new Error(
            "Input 'decl' is of an unsupported type: " + typeof decl
        );
    }

    /**
     * @param {$vardecl} declName - The name of the varref.
     * @deprecated use CustomClavaJoinPoints.varRef() instead
     */
    static varRefFromDecl($namedDecl: any) {
        return ClavaJoinPoints.varRef($namedDecl);
    }

    /**
     * @param {[$expr]} $expr - An expression to return.
     */
    static returnStmt($expr: any) {
        if ($expr === undefined) {
            return AstFactory.returnStmt();
        }

        return AstFactory.returnStmt($expr);
    }

    /**
     * Creates a new join point 'functionType'.
     *
     * @param {$type} $returnType - The return type of the function type.
     * @param {...$type} argTypes - The types of the arguments of the function type.
     */
    static functionType($returnType: any, ...argumentTypes: any[]) {
        return AstFactory.functionType($returnType, argumentTypes);
    }

    /**
     * Creates a new join point 'function'.
     *
     * @param {String} functionName - The name of the function.
     * @param {$functionType} $functionType - The type of the function.
     */
    static functionDeclFromType(functionName: string, $functionType: any) {
        Check.isString(functionName);
        Check.isJoinPoint($functionType);

        return AstFactory.functionDeclFromType(functionName, $functionType);
    }

    /**
     * Creates a new join point 'function'.
     *
     * @param {String} functionName - The name of the function.
     * @param {...$Decl} params - The parameters of the function.
     */
    static functionDecl(
        functionName: string,
        $returnType: any,
        ...$parameterVarDecls: any[]
    ) {
        Check.isString(functionName);

        return AstFactory.functionDecl(
            functionName,
            $returnType,
            $parameterVarDecls
        );
    }

    static assign($leftHand: any, $rightHand: any) {
        Check.isJoinPoint($leftHand, "expression");
        Check.isJoinPoint($rightHand, "expression");

        return AstFactory.assignment($leftHand, $rightHand);
    }

    /**
     * Creates a new join point 'if'.
     *
     * @param {String|$expr} $condition - The condition of the if statement. If a string, it is converted to a literal expression.
     * @param {$statement} [$then=undefined] - The body of the if
     * @param {$statement} [$else=undefined] - The body of the else
     *
     */
    static ifStmt($condition: string | any, $then?: any, $else?: any) {
        $condition = ClavaType.asExpression($condition);

        $then = ClavaType.asScope($then);
        $else = ClavaType.asScope($else);

        return AstFactory.ifStmt($condition, $then, $else);
    }

    /**
     * Creates a new join point 'binaryOp'.
     *
     * @param {String} op - The binary operator kind.
     * @param {String|$expr} $left - The left hand of the binary operator. If a string, it is converted to a literal expression.
     * @param {String|$expr} $right - The right hand of the binary operator. If a string, it is converted to a literal expression.
     * @param {String|$expr} $type - The return type of the operator. If a string, it is converted to a literal type. If undefined, uses int type.
     */
    static binaryOp(
        op: string,
        $left: string | any,
        $right: string | any,
        $type: string | any
    ) {
        $left = ClavaType.asExpression($left);
        $right = ClavaType.asExpression($right);
        $type = ClavaType.asType($type);

        return AstFactory.binaryOp(op, $left, $right, $type);
    }

    /**
     * Creates a new join point 'unaryOp'.
     *
     * @param {String} op - The unary operator kind.
     * @param {String|$expr} $expr - The sub-expression of the unary operator. If a string, it is converted to a literal expression.
     * @param {String|$expr} [$type] - The return type of the operator. If a string, it is converted to a literal type. If undefined, tries to infer the correct type based on the type of the $expr (inference might not be implemented for all operators).
     */
    static unaryOp(op: string, $expr: string | any, $type?: string | any) {
        $expr = ClavaType.asExpression($expr);
        $type = $type !== undefined ? ClavaType.asType($type) : $type;

        return AstFactory.unaryOp(op, $expr, $type);
    }

    /**
     * Creates a new join point 'expr' representing a parenthesis expression.
     *
     * @param {String|$expr} $expr - The expression inside the parenthesis. If a string, it is converted to a literal expression.
     */
    static parenthesis($expr: string | any) {
        $expr = ClavaType.asExpression($expr);
        return AstFactory.parenthesis($expr);
    }

    /**
     * @param {String|number} doubleLiteral - The number that will be a double literal.
     */
    static doubleLiteral(doubleLiteral: string | number) {
        return AstFactory.doubleLiteral(doubleLiteral);
    }

    /**
     * @param {String|number} integerLiteral - The number that will be a integer literal.
     */
    static integerLiteral(integerLiteral: string | number) {
        return AstFactory.integerLiteral(integerLiteral);
    }

    /**
     * @param {$typedefDecl} $typedefDecl - A typedef declaration.
     */
    static typedefType($typedefDecl: any) {
        Check.isJoinPoint($typedefDecl, "typedefDecl");

        return AstFactory.typedefType($typedefDecl);
    }

    /**
     * @param {$type} $underlyingType - The underlying type of the typedef.
     * @param {String} identifier - The name of the typedef.
     */
    static typedefDecl($underlyingType: any, identifier: string) {
        Check.isJoinPoint($underlyingType);
        Check.isString(identifier);

        return AstFactory.typedefDecl($underlyingType, identifier);
    }

    /**
     * @param {struct} $struct - a struct for the type
     * @return {elaboratedType} - an elaborated type for the given struct.
     */
    static structType($struct: any) {
        Check.isJoinPoint($struct, "struct");

        return AstFactory.structType($struct);
    }

    /**
     * Represents an explicit C-style cast (e.g., (double) a).
     *
     * @param {type} $type
     * @param {expr} $expr
     *
     * @return {cast}
     */
    static cStyleCast($type: any, $expr: any) {
        Check.isJoinPoint($type, "type");
        Check.isJoinPoint($expr, "expression");

        return AstFactory.cStyleCast($type, $expr);
    }

    /**
     * Creates an empty class with the given name and fields.
     *
     * @param {String} className
     * @param {...$field} [$fields = []]
     *
     * @return {class}
     */
    static classDecl(className: string, ...$fields: any[]) {
        Check.isString(className);

        for (var $field of $fields) {
            Check.isJoinPoint($field, "field");
        }

        return AstFactory.classDecl(className, $fields);
    }

    /**
     * Creates a field for a class.
     *
     * @param {String} fieldName
     * @param {$type} fieldType
     *
     * @return {$field}
     */
    static field(fieldName: string, $fieldType: any) {
        Check.isString(fieldName);
        Check.isJoinPoint($fieldType, "type");

        return AstFactory.field(fieldName, $fieldType);
    }

    /**
     * Creates an access specifier (e.g., public:), for classes.
     *
     * @param {String} accessSpecifier one of public, protected, private or none.
     */
    static accessSpecifier(accessSpecifier: string) {
        Check.isString(accessSpecifier);

        return AstFactory.accessSpecifier(accessSpecifier);
    }

    /**
     * Creates a new join point 'if'.
     *
     * @param {String|$statement} [$init=undefined] - The initialization of the for statement. If a string, it is converted to a literal expression.
     * @param {String|$statement} [$condition=undefined] - The condition of the for statement. If a string, it is converted to a literal expression.
     * @param {String|$statement} [$inc=undefined] - The increment of the for statement. If a string, it is converted to a literal expression.
     * @param {String|$statement} [$body=undefined] - The body of the for statement.
     *
     */
    static forStmt(
        $init?: string | any,
        $condition?: string | any,
        $inc?: string | any,
        $body?: string | any
    ) {
        $init = ClavaType.asStatement($init, true);
        $condition = ClavaType.asStatement($condition, true);
        $inc = ClavaType.asStatement($inc, true);
        $body = ClavaType.asStatement($body, true);

        return AstFactory.forStmt($init, $condition, $inc, $body);
    }

    /**
     * @param {string} name
     * @param {$type} $type
     * */
    static param(name: string, $type: any) {
        return AstFactory.param(name, $type);
    }

    /**
     * Tries to convert the given source into a join point, or throws an exception if it is not possible.
     *
     * If source is a string:
     *  - If it can be converted to a builtinType, returns a builtinType;
     *  - Otherwise, returns a typeLiteral;
     *
     * If source is a join point:
     *  - If is a $type, returns itself;
     *  - If the property .type is not undefined, returns .type;
     *  - Otherwise, throws an exception;
     *
     * @param {string|$jp} source
     * @return {$type}
     */
    static type(source: string | any) {
        if (isString(source)) {
            // Check if BuiltinType
            if (ClavaJavaTypes.BuiltinKind.isBuiltinKind(source)) {
                return ClavaJoinPoints.builtinType(source);
            }

            return ClavaJoinPoints.typeLiteral(source);
        }

        if (isJoinPoint(source)) {
            if (source.instanceOf("type")) {
                return source;
            }

            if (source.type !== undefined) {
                return source.type;
            }

            throw new Error(
                "CustomClavaJoinPoints.type: source is join point but is not a type, nor has a .type property: " +
                    source
            );
        }

        throw new Error(
            "CustomClavaJoinPoints.type: source must be a string or a join point: " +
                source
        );
    }

    /**
     * @param {$expr} $expr
     * @return {@exprStmt}
     *
     */
    static exprStmt($expr: any) {
        return AstFactory.exprStmt($expr);
    }

    /**
     * Creates an empty class with the given name and fields.
     *
     * @param {...$decl} [decls = []]
     *
     * @return {class}
     */
    static declStmt(...$declarations: any[]) {
        for (var $decl of $declarations) {
            Check.isJoinPoint($decl, "decl");
        }

        return AstFactory.declStmt($declarations);
    }

    /**
     * Creates a comment join point from the given text. If text has one line, creates an inline comment, otherwise creates a multi-line comment.
     *
     * @param {string} text - The text of the comment
     * @return {@comment}
     *
     */
    static comment(text: string) {
        return AstFactory.comment(text);
    }
}
