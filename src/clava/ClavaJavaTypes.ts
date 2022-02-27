import JavaTypes from "../lara/JavaTypes";

/**
 * Static variables with class names of Java classes used in the Clava API.
 * @class
 */
export default class ClavaJavaTypes {
    static getClavaNodes = function () {
        return JavaTypes.getType("pt.up.fe.specs.clava.ClavaNodes");
    };

    static getClavaNode = function () {
        return JavaTypes.getType("pt.up.fe.specs.clava.ClavaNode");
    };

    static getCxxJoinPoints = function () {
        return JavaTypes.getType("pt.up.fe.specs.clava.weaver.CxxJoinpoints");
    };

    static getBuiltinKind = function () {
        return JavaTypes.getType(
            "pt.up.fe.specs.clava.ast.type.enums.BuiltinKind"
        );
    };
}
