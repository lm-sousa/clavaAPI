import StringSet from "./StringSet.js";
import Check from "../Check.js";

/**
 * Filters join points according to the given rules.
 *
 * @param rules Object where each key represents the name of a join point attribute, and the value the pattern that we will use to match against the attribute.
 * The pattern can be a string (exact match), a regex or a function that receives the attribute and returns a boolean.
 */
export default class JpFilter {
    attributes: string[] = [];
    patterns: any[] = [];

    constructor(
        rules: { [index: string]: any } | { [key: string]: string | RegExp }
    ) {
        for (const key of Object.keys(rules)) {
            var rxPrefix = "rx_";
            if (key.startsWith(rxPrefix)) {
                console.log(
                    "JpFilter: using prefix 'rx_' to identify regexes is deprecated, just use a regex as value (e.g., /a/)"
                );
                this.attributes.push(key.substr(rxPrefix.length));
                this.patterns.push(new RegExp(rules[key]));
            } else {
                this.attributes.push(key);
                this.patterns.push(rules[key]);
            }
        }
    }

    /**
     * Filters an array of join points.
     *
     * @return an array of the join points that pass the filter
     */
    filter($jps: any[]) {
        return this.#filterAnd($jps);
    }

    #filterAnd($jps: any[]) {
        var $filteredJps = [];

        // For each join points, check if it passes all the filters
        for (var $jp of $jps) {
            var passesFilters = true;
            for (var index = 0; index < this.attributes.length; index++) {
                var matches = this.#match($jp, index);

                if (!matches) {
                    passesFilters = false;
                }
            }

            if (passesFilters) {
                $filteredJps.push($jp);
            }
        }

        return $filteredJps;
    }

    #filterOr($jps: any[]) {
        var seenNodes = new StringSet();

        var $filteredJps: any[] = [];

        // For each join points, check if it passes all the filters

        return $filteredJps;
    }

    #match($jp: any, i: number) {
        var attributeValue = $jp[this.attributes[i]];

        if (Check.isUndefined(attributeValue)) {
            return false;
        }

        // Convert to string
        var pattern = this.patterns[i];

        // Regex
        if (pattern instanceof RegExp) {
            return attributeValue.match(pattern);
        }
        // Function
        else if (typeof pattern === "function") {
            return pattern(attributeValue);
        } else {
            return attributeValue === pattern;
        }
    }
}
