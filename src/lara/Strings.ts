import JavaTypes from "./JavaTypes.js";
import Check from "./Check.js";
import { checkType, isString, stringReplacer } from "./LaraCore.js";

/**
 *  Utility methods related to Strings.
 *
 * @class
 */
export default class Strings {
    /**
     * Taken from here: https://stackoverflow.com/questions/154059/how-do-you-check-for-an-empty-string-in-javascript
     *
     * @return true if the given string is blank or contains only white-space
     */
    static isEmpty(string: string) {
        var realString = string.toString();
        return realString.length === 0 || !realString.trim();
        //return (string.length === 0 || !string.trim());
    }

    /**
     * Equivalent to JS 'replace'.
     *
     * @param {String} string - the string to process
     * @param {String|Regex} oldSequence - the sequence we want to replace. To replace all occurrences, use a Regex with the 'g' modifier (e.g., /<regex>/g). Regexes in string format automatically assumes the 'g' modifier.
     * @param {String} newSequence - the new value that will be used instead of the old value
     *
     * @return the string after the replacement is done
     */
    static replacer(
        string: string,
        oldSequence: string | RegExp,
        newSequence: string
    ) {
        if (isString(oldSequence)) {
            oldSequence = new RegExp(oldSequence, "g");
        }

        Check.isRegex(oldSequence, "Strings.replacer()");

        // Using JS function defined in LaraCode.js, in order to be able to use the function 'replace' (which is a reserved keyword in LARA)
        return stringReplacer(string, oldSequence, newSequence);
    }

    /**
     * Escapes HTML code.
     *
     * @return String with escaped code
     */
    static escapeHtml(html: string) {
        return JavaTypes.ApacheStrings.escapeHtml(html);
    }

    /**
     * Escapes JSON content.
     *
     * @return {string} String with escaped code
     */
    static escapeJson(jsonContents: string) {
        return JavaTypes.SpecsStrings.escapeJson(jsonContents);
    }

    /**
     * Iterates over the given string, line-by-line, looking for the given prefix. If found, returns the contents of the line after the prefix.
     *
     * @returns {string}
     */
    static extractValue(
        prefix: string,
        contents: string,
        errorOnUndefined: boolean = false
    ) {
        checkType(prefix, "string", "Strings.extractValue::prefix");
        checkType(contents, "string", "Strings.extractValue::contents");

        var lines = JavaTypes.StringLines.newInstance(contents);
        while (lines.hasNextLine()) {
            var line = lines.nextLine().trim();

            if (!line.startsWith(prefix)) {
                continue;
            }

            return line.substring(prefix.length);
        }

        if (errorOnUndefined) {
            throw (
                "Could not extract a value with prefix '" +
                prefix +
                "' from output '" +
                contents +
                "'"
            );
        }

        return undefined;
    }

    static asLines(string?: string | undefined) {
        if (string === undefined) {
            return undefined;
        }

        return JavaTypes.StringLines.getLines(string.toString());
    }

    /**
     * @param {*} value - The value to convert to Json.
     *
     * @return {string} A string representing the given value in the Json format.
     */
    static toJson(value: any) {
        return JSON.stringify(value);
    }

    /**
     * Returns a random unique identifier.
     */
    static uuid() {
        var uuid = JavaTypes.Uuid.randomUUID().toString();

        // Regular expression and 'g' is needed to replace all occurences
        uuid = Strings.replacer(uuid, /-/g, "_");
        return "id_" + uuid;
    }

    /**
     *  Normalizes a given string:
     * 1) Replaces \r\n with \n
     * 2) Trims lines and removes empty lines
     */
    static normalize(string: string) {
        return JavaTypes.SpecsStrings.normalizeFileContents(string, true);
    }

    /**
     * Converts a given object to a XML string.
     *
     * @param {Object} object - The object to serialize to XML.
     *
     * @return {String} The XML representation of the object.
     */
    static toXml(object: any) {
        return JavaTypes.XStreamUtils.toString(object);
    }

    /**
     * Converts a given XML string to an object.
     *
     * @param {String} xmlString - The XML representation of the object.
     *
     * @return {Object} The deserialized object.
     */
    static fromXml(xmlString: string) {
        return JavaTypes.XStreamUtils.from(
            xmlString,
            JavaTypes.getType("java.lang.Object").class
        );
    }
}
