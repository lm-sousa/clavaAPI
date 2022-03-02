import { println } from "../larai/includes/scripts/output";
import Io from "./Io";
import StringSet from "./util/StringSet";

/**
 * Methods related with the CSV format.
 *
 * @class
 */
export default class Csv {
    /**
     * Reads a CSV file and returns an object with the data inside the file.
     */
    static read(path: string, delimiter: string = ",") {
        var file = Io.getPath(path);
        if (!Io.isFile(file)) {
            throw "Io.readCsv: path '" + path + "' is not a file";
        }

        var CsvReader = Java.type("pt.up.fe.specs.util.csv.CsvReader");
        return Csv.parse(new CsvReader(file, delimiter));
    }

    /**
     * @param {string} contents
     */
    static parse(contents: string | any, delimiter: string = ",") {
        const CsvReader = Java.type("pt.up.fe.specs.util.csv.CsvReader");

        var csvReader: any;

        if (typeof contents === "string") {
            csvReader = new CsvReader(contents, delimiter);
        }
        // Undocumented option
        else if (CsvReader.class.isInstance(contents)) {
            csvReader = contents;
        } else {
            throw "Csv.parse: Unsupported type for argument 'contents'";
        }

        var csvData: { header: string[]; lines: string[][] } = {
            header: [],
            lines: [],
        };

        for (var headerValue of csvReader.getHeader()) {
            csvData.header.push(headerValue.trim());
        }

        var lineCounter = 0;
        while (csvReader.hasNext()) {
            lineCounter++;

            // Read line
            var values: string[] = csvReader.next();

            // Check line has the same number of elements as headerList
            if (values.length !== csvData.header.length) {
                println(
                    "Csv.parse: number of elements mismatch, header has " +
                        csvData.header.length +
                        "elements, line " +
                        lineCounter +
                        " has " +
                        values.length +
                        ". Skipping line"
                );
                continue;
            }

            // Create line
            var line: string[] = [];
            for (var value of values) {
                line.push(value.trim());
            }
            csvData.lines.push(line);
        }

        csvReader.close();

        return csvData;
    }

    /**
     * Converts an object in a specific format to a CSV string.
     *
     * @param {object} data an aggregate of values with the same keys, uses the keys of the given aggregate as the name of the entries, and the keys of the values as column entries.
     * @param {string} separator the separator character to use. By default is ;.
     * @return {string} the CSV corresponding to the object.
     */
    static generate(data: any, separator: string = ";") {
        var csv = "";
        const ln = "\n";

        // Colect columns, to build header
        csv = "Name";
        var columns = [];
        var seenColumns = new StringSet();
        for (var benchDataKey in data) {
            let benchData = data[benchDataKey];
            for (var benchKey in benchData) {
                if (seenColumns.has(benchKey)) {
                    continue;
                }

                seenColumns.add(benchKey);
                csv += separator + benchKey;
                columns.push(benchKey);
            }
        }
        csv += ln;

        for (var benchName in data) {
            csv += benchName;
            let benchData = data[benchName];

            for (var benchKey of columns) {
                var benchValue = benchData[benchKey];
                benchValue = benchValue !== undefined ? benchValue : "";
                csv += separator + benchValue;
            }
            csv += ln;
        }

        return csv;
    }
}
