import { println } from "../../larai/includes/scripts/output.js";
import JoinPoints from "../../weaver/JoinPoints.js";
import Weaver from "../../weaver/Weaver.js";

/**
 * Logger object, for printing/saving information.
 */

export default class LoggerBase {
    currentElements: { content: string; type: number }[] = [];
    functionMap: { [key: string]: string } = {};
    isGlobal = false;
    filename: string | undefined = undefined;
    afterJp = undefined;

    Type: { [key: string]: number } = {
        NORMAL: 1,
        INT: 2,
        DOUBLE: 3,
        STRING: 4,
        CHAR: 5,
        HEX: 6,
        OCTAL: 7,
        LITERAL: 8,
        LONG: 9,
    };

    printfFormat: {
        [key: number]: string | undefined;
    } = {
        1: undefined,
        2: "%d",
        3: "%f",
        4: "%s",
        5: "%c",
        6: "%x",
        7: "%o",
        8: undefined,
        9: "%ld",
    };

    constructor(isGlobal: boolean = false, filename?: string) {
        if (isGlobal) {
            println(
                "[Logger-warning] global Logger is not implemented yet, reverting to local Logger"
            );
            isGlobal = false;
        }

        this.isGlobal = isGlobal;
        this.filename = filename;
    }

    // Using enum pattern described here: https://stijndewitt.com/2014/01/26/enums-in-javascript/

    /**
     * Used for both C and Java printf functions
     */

    isGlobalFn() {
        println("Is Global Fn:" + this.isGlobal);
    }

    /**
     *  The 'last' join point after .log() is called.
     */
    getAfterJp() {
        return this.afterJp;
    }

    protected clear() {
        this.currentElements = [];
    }

    log($jp: any, insertBefore: boolean = false) {
        throw "Logger: 'log' method must be implemented";
    }

    /**
     * Helper method which call 'log' with 'insertBefore' set to true
     */
    logBefore($jp: any) {
        this.log($jp, true);
    }

    /**
     * Verifies that the given $jp is inside a function.
     *
     * Requires global attribute 'ancestor'.
     *
     * @return true if $jp is inside a function, false otherwise
     */
    protected validateJp($jp: any, functionJpName: string) {
        var $function = $jp.ancestor(functionJpName);

        if ($function === undefined) {
            println(
                "Logger: tried to insert log around joinpoit " +
                    $jp +
                    ", but is not inside a function"
            );
            this.clear();
            return false;
        }

        return true;
    }

    protected insert($jp: any, insertBefore: boolean, code: string) {
        this.insertCode($jp, insertBefore, code);

        // Clear internal state
        this.clear();
    }

    /**
     * Inserts the given code before/after the given join point.
     *
     * Override this method if you need to specialize the insertion.
     */
    protected insertCode($jp: any, insertBefore: boolean, code: string) {
        var insertBeforeString = insertBefore ? "before" : "after";

        if (insertBefore) {
            $jp.insert(insertBeforeString, code);
            this.afterJp = $jp;
        } else {
            this.afterJp = $jp.insertAfter(code);
        }
    }

    /**
     * Appends the given string to the current buffer.
     *
     * @param {String} text - the text to append
     * @return {lara.code.Logger} the current logger instance
     */
    append(text: string) {
        return this.append_private(text, this.Type.NORMAL);
    }

    /**
     * The same as 'append'.
     */
    text(text: string) {
        return this.append(text);
    }

    /**
     * The same as 'append', but adds a new line at the end of the buffer.
     */
    appendln(text: string) {
        return this.append(text).ln();
    }

    /**
     * Appends a new line to the buffer.
     */
    ln() {
        return this.append_private("\\n", this.Type.NORMAL);
    }

    /**
     * Appends a tab to the buffer.
     */
    tab() {
        return this.append("\\t");
    }

    /**
     * Appends an expression that represents a double.
     */
    appendDouble(expr: string | any) {
        return this.append_private(expr, this.Type.DOUBLE);
    }

    /**
     * The same as 'appendDouble'.
     */
    double(expr: string | any) {
        return this.appendDouble(expr);
    }

    /**
     * Appends an expression that represents a int.
     */
    appendInt(expr: string | any) {
        return this.append_private(expr, this.Type.INT);
    }

    /**
     * The same as 'appendInt'.
     */
    int(expr: string | any) {
        return this.appendInt(expr);
    }

    /**
     * Appends an expression that represents a long.
     */
    appendLong(expr: string | any) {
        return this.append_private(expr, this.Type.LONG);
    }

    /**
     * The same as 'appendLong'.
     */
    long(expr: string | any) {
        return this.appendLong(expr);
    }

    /**
     * Appends an expression that represents a string.
     */
    appendString(expr: string | any) {
        return this.append_private(expr, this.Type.STRING);
    }

    /**
     * The same as 'appendString'.
     */
    string(expr: string | any) {
        return this.appendString(expr);
    }

    /**
     * Appends an expression that represents a char.
     */
    appendChar(expr: string | any) {
        return this.append_private(expr, this.Type.CHAR);
    }

    /**
     * The same as 'appendChar'.
     */
    char(expr: string | any) {
        return this.appendChar(expr);
    }

    /**
     * Appends an expression that represents a hex.
     */
    appendHex(expr: string | any) {
        return this.append_private(expr, this.Type.HEX);
    }

    /**
     * The same as 'appendHex'.
     */
    hex(expr: string | any) {
        return this.appendHex(expr);
    }

    /**
     * Appends an expression that represents an octal.
     */
    appendOctal(expr: string | any) {
        return this.append_private(expr, this.Type.OCTAL);
    }

    /**
     * The same as 'appendOctal'.
     */
    octal(expr: string | any) {
        return this.appendOctal(expr);
    }

    // Private append function
    protected append_private(message: string | any, type?: number) {
        // If message is a join point, convert to code first
        if (Weaver.isJoinPoint(message)) {
            message = JoinPoints.getCode(message);
        }

        // Do not push message if empty
        if (message === "") {
            return this;
        } else if (message instanceof Number) {
            message = String(message);

            if (message.indexOf(".") === -1) {
                message += ".0";
            }
        }

        // Force type to be defined
        if (type === undefined) {
            throw "Logger: type must be defined";
        }

        this.currentElements.push({ content: message, type: type });
        return this;
    }

    protected warn(message: string) {
        println("[Logger Warning] " + message);
    }

    protected info(message: string) {
        println("[Logger] " + message);
    }

    // Receives an element{content, type} and returns the content with or without quotation marks, accordingly
    protected getPrintableContent(element: { content: string; type: number }) {
        var content = element.content;

        switch (element.type) {
            case this.Type.NORMAL:
            case this.Type.STRING:
                return '"' + element.content + '"';
                break;
            case this.Type.CHAR:
                return "'" + element.content + "'";
                break;
            case this.Type.DOUBLE:
            case this.Type.LITERAL:
            default:
                return element.content;
                break;
        }
    }

    /**
     * generates printf like code for c and java,
     * @param printFunctionName the name of the function to use (printf for C, System.out.println for Java)
     */
    protected formatForPrintf(
        printFunctionName: string,
        prefix?: string,
        suffix?: string,
        delimiter?: string
    ) {
        if (delimiter === undefined) {
            delimiter = '"';
        }

        if (prefix === undefined) {
            prefix = "(" + delimiter;
        }

        if (suffix === undefined) {
            suffix = ");";
        }

        // Create code from elements
        var code =
            printFunctionName +
            prefix +
            this.currentElements
                .map((element: { content: string; type: number }) => {
                    var enumType = this.Type;
                    if (element.type === enumType.NORMAL) {
                        return element.content;
                    }
                    return this.printfFormat[element.type];
                }, this)
                .join("") +
            delimiter;

        var valuesCode = this.currentElements
            // Filter only non-NORMAL types
            .filter((element: { content: string; type: number }) => {
                return element.type !== this.Type.NORMAL;
            }, this)
            .map((element: { content: string; type: number }) => {
                // Even though _getPrintableContent tests an always unmet condition (type === NORMAL) it represents a reusable piece of code for both C and C++
                return this.getPrintableContent(element);
            }, this)
            .join(", ");

        if (valuesCode.length > 0) {
            code = code + ", " + valuesCode;
        }

        code = code + suffix;
        return code;
    }

    /**
     *
     *
     * @param $function Function where name will be declared
     * @param nameGenerator function that receives no arguments and generates a new name
     */
    protected declareName(functionId: string, nameGenerator: () => string) {
        // Check if thislogger was already declared in the given function

        var name = this.functionMap[functionId];

        if (name !== undefined) {
            var alreadyDeclared = true;
        } else {
            name = nameGenerator();
            this.functionMap[functionId] = name;
            alreadyDeclared = false;
        }

        return {
            name: name,
            alreadyDeclared: alreadyDeclared,
        };
    }
}
