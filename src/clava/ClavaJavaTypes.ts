import JavaTypes from "../lara/JavaTypes.js";

/**
 * Static variables with class names of Java classes used in the Clava API.
 * @class
 */
export default class ClavaJavaTypes {
    static get ClavaNodes() {
        return JavaTypes.getType("pt.up.fe.specs.clava.ClavaNodes");
    }

    static get ClavaNode() {
        return JavaTypes.getType("pt.up.fe.specs.clava.ClavaNode");
    }

    static get CxxJoinPoints() {
        return JavaTypes.getType("pt.up.fe.specs.clava.weaver.CxxJoinpoints");
    }

    static get BuiltinKind() {
        return JavaTypes.getType(
            "pt.up.fe.specs.clava.ast.type.enums.BuiltinKind"
        );
    }
}
