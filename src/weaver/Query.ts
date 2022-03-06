import JoinPoints from "./JoinPoints.js";
import Selector from "./Selector.js";

/**
 * Class for selection of join points. Provides an API similar to the keyword 'select'.
 *
 * Search functions of this class return weaver.Selector objects, please refer to that class for more details regarding available functions and search options.
 *
 * @class
 */
export default class Query {
    /**
     * Returns the root node of the current AST.
     */
    static root() {
        return new JoinPoints().root();
    }

    /**
     * The same as Query.searchFrom(), but uses the root node as $baseJp.
     *
     * @param {$jp} $baseJp - starting join point for the search.
     * @param {String} type - type of the join point to search.
     * @param {Object|String|Function|Regex} [filter = {}] - filter rules for the search.
     */
    static search(type: string, filter?: Object | String | Function | RegExp) {
        return Query.searchFrom(undefined, type, filter);
    }

    /**
     * In-depth search of join points of the given type, starting from a base join point (exclusive).
     *
     * @param {$jp} $baseJp - starting join point for the search.
     * @param {String} type - type of the join point to search.
     * @param {Object|String|Function|Regex} [filter = {}] - filter rules for the search. If the value is an object, each field of the object represents a rule that will be applied over the attribute that has the same name as the name of the field. If the value is not an object (e.g., String, Regex, Lambda), it is interpreted as a single rule that will be applied over the default attribute of the given type. E.g., if type is 'function', the value is a String 'foo' and the default attribute of function is 'name', this is equivalent as passing as value the object {'name':'foo'}. Rules can be a String (i.e., will match the value of the attribute against a string), a Regex (will match the value of the attribute against a regex) or a Function (i.e., function receives the value of the attribute and returns true if there is a match, or false otherwise).
     *
     * @return {weaver.Selector} the results of the search.
     */
    static searchFrom(
        $baseJp: any,
        type: string,
        filter?: Object | String | Function | RegExp
    ) {
        return new Selector($baseJp).search(type, filter);
    }

    /**
     * The same as Query.searchFrom(), but $baseJp is included in the search.
     *
     * @param {$jp} $baseJp - starting join point for the search.
     * @param {String} type - type of the join point to search.
     * @param {Object|String|Function|Regex} [filter = {}] - filter rules for the search.
     */
    static searchFromInclusive(
        $baseJp: any,
        type: string,
        filter?: Object | String | Function | RegExp
    ) {
        return new Selector($baseJp, true).search(type, filter);
    }
}
