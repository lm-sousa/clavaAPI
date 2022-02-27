import { checkType } from "../lara/LaraCore";
import WeaverOptions from "./WeaverOptions";

/**
 * Object for launching weaver instances.
 * @constructor
 * @param {string} language - The language the weaver to launch should use
 */
export default class WeaverLauncherBase {
    language: string;

    constructor(language: string) {
        checkType(language, "string", "WeaverLauncher::language");

        // Check if language is supported
        var supportedLanguages = WeaverOptions.getSupportedLanguages();
        if (!supportedLanguages.contains(language)) {
            throw (
                "WeaverLauncher: language '" +
                language +
                "' not supported. Supported languages: " +
                supportedLanguages
            );
        }

        this.language = language;
    }

    /**
     * Launches a Clava weaving session.
     *
     * @param {(string|Array)} args - The arguments to pass to the weaver, as if it was launched from the command-line
     * @return {Boolean} true if the weaver execution without problems, false otherwise
     */
    execute(args: string | any[]) {
        throw "WeaverLauncher.run: not implemented";
    }
}
