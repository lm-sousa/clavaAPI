import StringSet from "./StringSet.js";
import Io from "../Io.js";
import { checkInstance, checkType, info } from "../LaraCore.js";
import java from "java";

/**
 * Interface with Java class DataStore, used for storing arbitrary information.
 */
export default class DataStore {
    data: any;
    definition: any;
    checkKeys: boolean;
    allowedKeys: StringSet;
    keyAliases: { [key: string]: string };

    constructor(
        data?: DataStore | string | any | undefined,
        definition?: any | undefined
    ) {
        if (data === undefined) {
            data = this.#getDataStoreClass().newInstance("DataStore from Lara");
        }

        if (typeof data === "string") {
            data = this.#getDataStoreClass().newInstance(data);
        }

        // Check if Lara DataStore, get Java DataStore
        if (data instanceof DataStore) {
            data = data.getData();
        }

        checkInstance(
            data,
            this.#getDataStoreClass(),
            "DataStore::data",
            this.#getDataStoreClass()
        );

        this.data = data;

        // Determine definition
        this.definition = definition;
        // If no definition as argument, try to get one from data
        if (this.definition === undefined) {
            if (this.data.getStoreDefinitionTry().isPresent()) {
                this.definition = this.data.getStoreDefinitionTry().get();
            }
        }

        // Enable key checking if there is a definition
        this.checkKeys = this.definition !== undefined;

        //var optionalDef = this.data.getStoreDefinition();
        //this.checkKeys = optionalDef.isPresent();

        // Build set with allowed keys
        this.allowedKeys = new StringSet();
        if (this.checkKeys) {
            for (var dataKey of this.definition.getKeys()) {
                this.allowedKeys.add(dataKey.getName());
            }
        }

        // Aliases map
        this.keyAliases = {};
        /*
	if(this.allowedKeys === undefined) {
		console.log("ALLOWED KEYS UNDEFINED");
		console.log("DATA:" + data);
		console.log("DEFINITION:" + definition);
	}
	*/
    }

    /**
     * @return the value corresponding to the given key, or undefined if no value or null value is found
     */
    get(key: string) {
        checkType(key, "string", "DataStore.get::key");

        var processedKey = this.#processKey(key, "get");

        var value = this.data.get(processedKey);

        if (value === null) {
            return undefined;
        }

        return value;
    }

    /**
     * Store the given value with the given key.
     */
    put(key: string, value: any) {
        checkType(key, "string", "DataStore.put::key");
        //console.log("KEY:" + key);
        var processedKey = this.#processKey(key, "put");
        //console.log("PROCESSED KEY:" + processedKey);
        //console.log("DATA BEFORE:" + this.data.toString());
        this.data.setRaw(processedKey, value);
        //console.log("DATA AFTER:" + this.data.toString());
    }

    disableKeyChecking() {
        //console.log("Disabling key checking");
        this.checkKeys = false;
    }

    /**
     * @return java.lang.Class representing the type of the value of the given key
     */
    getType(key: string) {
        if (!this.checkKeys) {
            info(
                "DataStore has no StoreDefinition, retuning undefined",
                "DataStore.getType"
            );
            return undefined;
        }

        this.#checkKey(key, "getType");
        return this.definition.getKey(key).getValueClass();
    }

    getKeys() {
        return this.allowedKeys.values();
    }

    getData() {
        return this.data;
    }

    addAlias(key: string, alias: string) {
        checkType(key, "string", "DataStore.addAlias::key");
        checkType(alias, "string", "DataStore.addAlias::alias");

        // Check if alias was already defined
        var previousKey = this.keyAliases[alias];
        if (previousKey !== undefined) {
            info(
                "Alias '" +
                    alias +
                    "' is already defined and points to key '" +
                    previousKey +
                    "', overwriting definition and pointing to key '" +
                    key +
                    "'",
                "DataStore.addAlias"
            );
        }

        // Check if key is valid before adding alias
        this.#checkKey(key, "addAlias");

        // Add alias
        this.keyAliases[alias] = key;
    }

    /*** PRIVATE OVERRIDABLE FUNCTIONS ***/

    /**
     * Wraps a Java DataStore around a Lara DataStore.
     */
    #dataStoreWrapper(javaDataStore: string | DataStore | any | undefined) {
        return new DataStore(javaDataStore, this.definition);
    }

    /*** PRIVATE FUNCTIONS ***/

    /**
     * @return the Java class of DataStore
     */
    #getDataStoreClass() {
        return java.import("org.suikasoft.jOptions.Interfaces.DataStore");
    }

    /**
     * @return the Java class with utility methods for DataStore
     */
    #getUtilityClass() {
        return java.import("org.suikasoft.jOptions.JOptionsUtils");
    }

    #processKey(key: string, functionName?: string) {
        // Check if there is an alias for the key
        var realKey = this.keyAliases[key];

        // If no alias, return original key; otherwise, return correct key
        realKey = realKey === undefined ? key : realKey;

        // Check the correct key
        // Disabled check in order to use extra information, such as the folder of the configuration file, when present
        //this._checkKey(realKey, functionName);

        return realKey;
    }

    #checkKey(key: string, functionName: string) {
        if (!this.checkKeys) {
            return;
        }

        if (this.allowedKeys.has(key)) {
            return;
        }

        functionName = functionName === undefined ? "_checkKey" : functionName;

        var message =
            "DataStore." +
            functionName +
            " : Key '" +
            key +
            "' is not allowed, available keys:\n";
        message += " - '" + this.allowedKeys.values().join("'\n - '") + "'";

        throw message;
    }

    save(fileOrBaseFolder: string, optionalFile?: string | undefined) {
        this.#getUtilityClass().saveDataStore(
            Io.getPath(fileOrBaseFolder, optionalFile),
            this.data
        );
    }

    load(fileOrBaseFolder: string, optionalFile?: string | undefined) {
        if (this.definition === undefined) {
            throw "DataStore.load: current DataStore does not have keys definition, cannot load from file";
        }

        var javaDataStore = this.#getUtilityClass().loadDataStore(
            Io.getPath(fileOrBaseFolder, optionalFile),
            this.definition
        );

        return this.#dataStoreWrapper(javaDataStore);
    }

    copy() {
        // Save this data store to a temporary file, a load it again. Return loaded object
        var tempFilename = "_datastore_copy_temp.datastore";
        this.save(tempFilename);
        return this.load(tempFilename);
    }

    /**
     * Checks if the given key has an associated value in the DataStore.
     *
     * @param {string} key - The name of the key to check
     * @returns {boolean} true if the data store has a value for the given key, false otherwise
     */
    hasValue(key: string) {
        return this.data.hasValueRaw(key);
    }

    /**
     *
     * @return {J#java.io.File} The folder of the configuration file, if one was used, or undefined otherwise.
     *
     */
    getConfigurationFolder() {
        var currentFolder = this.data.get("joptions_current_folder_path");

        //if(isUndefined(currentFolder)) {
        if (currentFolder.isEmpty()) {
            return undefined;
        }

        //return Io.getPath(currentFolder);
        return Io.getPath(currentFolder.get());
    }

    /**
     * The folder that is considered the working folder of the current context.
     *
     * 1) If a configuration file was used, returns the path of the configuration file;
     * 2) Otherwise, returns the folder from where the weaver was launched.
     *
     * @return {J#java.io.File} The folder where the code represented by the AST will be written at the end of execution.
     */
    getContextFolder() {
        var currentFolder = this.getConfigurationFolder();

        if (currentFolder === undefined) {
            currentFolder = Io.getWorkingFolder();
        }

        return currentFolder;
    }
}
