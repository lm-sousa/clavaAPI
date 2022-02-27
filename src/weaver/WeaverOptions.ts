import Weaver from "./Weaver";
import WeaverDataStore from "./util/WeaverDataStore";
import JavaTypes from "../lara/JavaTypes";

/**
 * Contains configuration-related methods of the weaver.
 * @class
 */
export default class WeaverOptions {
    /**
     * @return DataStore with the data of the current weaver
     */
    static getData = function () {
        return new WeaverDataStore(JavaTypes.LaraI.getThreadLocalData());
    };

    /**
     * @return {String} a string with the command-line flags for the current options
     */
    static toCli = function () {
        return JavaTypes.LaraCli.getWeaverOptions(
            Weaver.getWeaverEngine()
        ).toCli(WeaverOptions.getData().getData());
    };

    /**
     * @return java.util.Set<String> with the languages supported by the current weaver
     */
    static getSupportedLanguages = function () {
        return Weaver.getWeaverEngine().getLanguages();
    };
}
