import JoinPointsBase from "./JoinPointsBase";
import ClavaJavaTypes from "../clava/ClavaJavaTypes";

export default class JoinPoints extends JoinPointsBase {
    static getInstance(): JoinPoints {
        return JoinPointsInstance;
    }

    toJoinPoint(node: any) {
        var cxxJps = ClavaJavaTypes.CxxJoinPoints;
        return cxxJps.createFromLara(node);
    }

    /**
     *
     * @return {$jp[]} the children of the given node
     */
    #all_children($jp: { children: any }) {
        return $jp.children;
    }

    /**
     *
     * @return {$jp[]} the descendants of the given node
     */
    #all_descendants($jp: { descendants: any }) {
        return $jp.descendants;
    }

    /**
     *
     * @return {$jp[]} all the nodes that are inside the scope of a given node
     */
    #all_scope_nodes($jp: { scopeNodes: any }) {
        return $jp.scopeNodes;
    }
}

const JoinPointsInstance = new JoinPoints();
