import LoggerBase from "./LoggerBase";
import IdGenerator from "../util/IdGenerator";
import PrintOnce from "../util/PrintOnce";
import Clava from "../../clava/Clava";

class Logger extends LoggerBase {
    #isCxx: boolean = false;
    insertBefore: boolean = false;

    ln() {
        // At this point, we don't know if the new line will be in a C++ or C file
        /*
			if(Clava.isCxx()) {
				return this.append_private("std::endl", Logger.Type.LITERAL);
			}
		*/
        return this.append_private("\\n", Logger.Type.NORMAL);
    }

    /**
     * Adds code that prints the message built up to that point with the append() functions.
     *
     * TODO: Improve this comment, add JSDoc tags
     */
    log($jp: any, insertBefore: boolean = false) {
        if ($jp === undefined) {
            this.warn("Given join point is undefined");
            return;
        }

        var $function = this.#logSetup($jp, insertBefore);
        if ($function === undefined) {
            return;
        }

        var $file = $function.ancestor("file");

        this.#isCxx = $file.isCxx;

        var code = undefined;
        if ($file.isCxx) {
            code = this.#log_cxx($file, $function);
        } else {
            code = this.#log_c($file, $function);
        }

        if (code === undefined) {
            return;
        }

        this.insert($jp, insertBefore, code);

        return this;
    }

    /**
     * Appends an expression that represents a long long.
     */
    appendLongLong(expr: string | any) {
        return this.append_private(expr, Logger.Type.LONGLONG);
    }

    /**
     * Appends an expression that represents a long long.
     */
    longLong(expr: string | any) {
        return this.appendLongLong(expr);
    }

    /**
     * Checks the initial constrains before executing the actual log (ancestor function, minimum of elements to log, defines the value of insertBefore)
     * Should be called on the beggining of each implementation of log
     *
     * @return undefined on failure and a $function instance if successful
     */
    #logSetup($jp: any, insertBefore: boolean = false) {
        // Validate join point
        if (!this.validateJp($jp, "function")) {
            return undefined;
        }

        if (this.currentElements.length === 0) {
            this.info("Nothing to log, call append() first");
            return undefined;
        }

        this.insertBefore = insertBefore;
        // return $function
        return $jp.ancestor("function");
    }

    #log_cxx($file: any, $function: any) {
        if (Clava.useSpecsLogger) {
            return this.#log_cxx_specslogger($file, $function);
        } else {
            return this.#log_cxx_stdcpp($file, $function);
        }
    }

    #log_cxx_specslogger($file: any, $function: any) {
        var loggerName = this.#setup_cxx_specslogger($file, $function);

        // Create code from elements
        var code =
            loggerName +
            ".msg(" +
            this.currentElements
                .map((element) => {
                    return this.getPrintableContent(element);
                }, this)
                .join(", ") +
            ");";

        return code;
    }

    /**
     * Sets up the code for the Logger in the file and function that is called
     */
    #setup_cxx_specslogger($file: any, $function: any) {
        // Warn user about dependency to SpecsLogger library
        //Clava.infoProjectDependency("SpecsLogger", "https://github.com/specs-feup/specs-c-libs");
        PrintOnce.message(
            "Woven code has dependency to project SpecsLogger, which can be found at https://github.com/specs-feup/specs-c-libs"
        );

        var declaredName = this.declareName(
            $function.declaration(true),
            function () {
                return IdGenerator.next("clava_logger_");
            }
        );
        var loggerName = declaredName.name;

        if (declaredName.alreadyDeclared) {
            return loggerName;
        }

        // Add include to Logger for Cpp only
        $file.addInclude("SpecsLogger.h", false);

        // Get correct logger
        var loggerDecl = undefined;

        // If filename use FileLogger
        if (this.filename !== undefined) {
            loggerDecl =
                "FileLogger " + loggerName + '("' + this.filename + '");';
        }
        // Otherwise, use ConsoleLogger
        else {
            loggerDecl = "ConsoleLogger " + loggerName + ";";
        }

        // Add declaration of correct logger
        $function.body.insertBegin(loggerDecl);

        return loggerName;
    }

    #log_cxx_stdcpp($file: any, $function: any) {
        var streamName;
        if (this.filename === undefined) {
            streamName = this.#setup_cxx_stdcpp_console($file, $function);
        } else {
            streamName = this.#setup_cxx_stdcpp_file($file, $function);
        }

        // Create code from elements.
        var code =
            streamName +
            " << " +
            this.currentElements
                .map(function (element) {
                    if (element.type === Logger.Type.NORMAL) {
                        return '"' + element.content + '"';
                    }

                    return element.content;
                }, this)
                .join(" << ") +
            ";";

        return code;
    }

    #setup_cxx_stdcpp_console($file: any, $function: any) {
        var streamName = "std::cout";

        // Add include
        $file.addInclude("iostream", true);

        return streamName;
    }

    #setup_cxx_stdcpp_file($file: any, $function: any) {
        if (this.filename === undefined) {
            return;
        }

        var declaredName = this.declareName(
            $function.declaration(true),
            function () {
                return IdGenerator.next("log_file_");
            }
        );
        var streamName = declaredName.name;

        if (declaredName.alreadyDeclared) {
            return streamName;
        }

        // Add include
        $file.addInclude("fstream", true);

        // Declare file stream and open file
        $function.body.insertBegin(
            this.#clava_logger_filename_declaration_cpp(
                streamName,
                this.filename
            )
        );

        return streamName;
    }

    #log_c($file: any, $function: any) {
        if (this.filename === undefined) {
            return this.#log_c_console($file, $function);
        } else {
            return this.#log_c_file($file, $function);
        }
    }

    #log_c_console($file: any, $function: any) {
        // Setup
        $file.addInclude("stdio.h", true);

        return this.printfFormat("printf");
    }

    #log_c_file($file: any, $function: any) {
        var fileVar = this.#log_c_file_setup($file, $function);

        return this.printfFormat("fprintf", "(" + fileVar + ', "');
    }

    #log_c_file_setup($file: any, $function: any) {
        if (this.filename === undefined) {
            return;
        }

        var declaredName = this.declareName(
            $function.declaration(true),
            function () {
                return IdGenerator.next("log_file_");
            }
        );
        var varname = declaredName.name;

        if (declaredName.alreadyDeclared) {
            return varname;
        }

        // Setup
        $file.addInclude("stdio.h", true);
        $file.addInclude("stdlib.h", true);

        // Declare and open file
        var code = this.#clava_logger_filename_declaration(
            varname,
            this.filename
        );

        // Add code at beginning of the function
        $function.body.insertBegin(code);

        // Close file at the return points of the function
        $function.insertReturn("fclose(" + varname + ");");

        return varname;
    }

    #insertCode($jp: any, insertBefore: boolean, code: string) {
        var insertBeforeString = insertBefore ? "before" : "after";

        if (insertBefore) {
            $jp.insert(insertBeforeString, code);
            this.afterJp = $jp;
        } else {
            // If $jp is a 'scope' with a 'function' parent, insert before return instead
            if (
                $jp.instanceOf("scope") &&
                $jp.parent !== undefined &&
                $jp.parent.instanceOf("function")
            ) {
                this.afterJp = $jp.parent.insertReturn(code);
            } else {
                this.afterJp = $jp.insertAfter(code);
            }
        }
    }

    #clava_logger_filename_declaration(varname: string, filename: string) {
        return `FILE *${varname} = fopen("${filename}", "w+");
if (${varname} == NULL)
{
    printf("Error opening file ${filename}\n");
    exit(1);
}`;
    }

    #clava_logger_filename_declaration_cpp(
        streamName: string,
        filename: string
    ) {
        return `std::ofstream ${streamName};
${streamName}.open("${filename}", std::ios_base::app);`;
    }
}

namespace Logger {
    // Adds C/C++ specific types
    // 64-bit int

    export enum TypeExtension {
        LONGLONG = 100,
    }
    export type Type = LoggerBase.Type | TypeExtension;

    export const printfFormat: { [key in Type]: string | undefined } = {
        ...LoggerBase.printfFormat,
        [TypeExtension.LONGLONG]: "%I64lld",
    };
}

export default Logger;
