import Check from "../lara/Check.js";
import { checkJoinPoint, isUndefined } from "../lara/LaraCore.js";
import Weaver from "./Weaver.js";

/**
 * Object which provides low-level join point-related methods.
 * @constructor
 */
export default class JoinPointsBase {
    /**
     *
     * @return {$jp} the current root node of the AST
     */
    root() {
        return Weaver.getWeaverEngine().getRootJp();
    }

    /**
     * Converts an AST node to a JointPoint.
     *
     * @param {node}
     * @return {$jp}
     */
    toJoinPoint(node: any) {
        throw "JoinPoints.toJoinPoint: not implemented";
    }

    /**
     *
     * @return {$jp[]} all the children of the given node
     */
    #all_children($jp: any) {
        throw "JoinPoints._all_children: not implemented";
    }

    /**
     *
     * @return {$jp[]} all the descendants of the given node
     */
    #all_descendants($jp: any) {
        throw "JoinPoints._all_descendants: not implemented";
    }

    /**
     *
     * @return {$jp[]} all the nodes that are inside the scope of a given node
     */
    #all_scope_nodes($jp: any) {
        throw "JoinPoints._all_scope: not implemented";
    }

    /**
     *
     * @return {$jp[]} the nodes inside the scope of the given node.
     */
    scope($jp: any, jpType: string | any) {
        return this.#getNodes(this.#all_scope_nodes, $jp, jpType);
    }

    /**
     *
     * @return {$jp[]} the children of the given node, according to the AST
     */
    children($jp: any, jpType: string | any) {
        return this.#getNodes(this.#all_children, $jp, jpType);
    }

    /**
     *
     * @return {$jp[]} the descendants of the given node, according to the AST
     */
    descendants($jp: any, jpType: string | any) {
        return this.#getNodes(this.#all_descendants, $jp, jpType);
    }

    /**
     *
     * @return {$jp[]} the nodes related with the given node, according to the search function
     */
    #getNodes(
        searchFunction: (arg0: any) => any,
        $jp: any,
        jpType: string | any
    ) {
        // TODO: This function can be optimized by using streaming

        Check.isDefined(searchFunction);

        if ($jp === undefined) {
            return [];
        }

        Check.isJoinPoint($jp);

        var descendants = searchFunction($jp);

        if (jpType === undefined) {
            return descendants;
        }

        return this.#filterNodes(descendants, jpType);
    }

    #filterNodes($jps: any[], jpType: string | any) {
        var filteredJps = [];

        for (var $jp of $jps) {
            if (!$jp.instanceOf(jpType)) {
                continue;
            }

            filteredJps.push($jp);
        }

        return filteredJps;
    }

    /**
     * Iterates of attributeNames, returns the first value that is not null or undefined.
     * If no value is found for the given attributes, returns undefined
     *
     */
    static getAttribute($jp: any, attributeNames: string[]) {
        for (var attribute of attributeNames) {
            var value = $jp[attribute];
            if (!isUndefined(value)) {
                return value;
            }
        }

        return undefined;
    }

    /**
     * Helper method of getAttribute which throws an exception if no value is found
     */
    static getAttributeStrict($jp: any, attributeNames: string[]) {
        var value = this.getAttribute($jp, attributeNames);

        if (value === undefined) {
            throw (
                "Could not find any of the given attributes in " +
                $jp +
                ":" +
                attributeNames.join(", ")
            );
        }

        return value;
    }

    /**
     * Converts the join point to a string of code. Expects attribute 'code' to exist.
     *
     * @param {joinpoint} $jp - join point to convert to code.
     *
     * @return {String} a String with the code representation of this join point.
     */
    static getCode($jp: any) {
        checkJoinPoint($jp);

        // Check if attribute code is defined
        if (!Weaver.hasAttribute($jp, "code")) {
            throw "JoinPoints.getCode(): expected attribute 'code' to exist";
        }

        return $jp["code"];
    }
}
