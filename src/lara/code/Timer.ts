import TimerBase from "./TimerBase.js";
import Logger from "./Logger.js";
import IdGenerator from "../util/IdGenerator.js";
import TimeUnits from "../util/TimeUnits.js";
import ClavaJoinPoints from "../../clava/ClavaJoinPoints.js";
import StringSet from "../util/StringSet.js";
import { println } from "../../larai/includes/scripts/output.js";
import Platforms from "../Platforms.js";
import Clava from "../../clava/Clava.js";

export default class Timer extends TimerBase {
    addedDefines = new StringSet();

    /**
     * Times the code of a given section.
     *
     * @param $start [Mandatory] Starting point of the time measure
     * @param prefix Message that will appear before the time measure. If undefined, empty string will be used.
     * @param $end Ending point of the time measure. If undefined, measure is done around starting point.
     * @param {String|$expr} $condition - If defined, adds an if statement wrapping the time measuring code. If a string, it is converted to a literal expression.
     */
    time(
        $start: any,
        prefix: string = "",
        $end?: any,
        $condition?: string | any
    ) {
        if (!this.timeValidate($start, $end, "function")) {
            return;
        }

        var $file = $start.ancestor("file");

        if ($file === undefined) {
            println(
                "Could not find the corresponding file of the given joinpoint: " +
                    $start
            );
            return;
        } else if ($file.isCxx) {
            return this._time_cpp($start, prefix, $end, $condition);
        } else {
            return this._time_c($start, prefix, $end, $condition);
        }
    }

    _time_cpp(
        $start: any,
        prefix: string = "",
        $end?: any,
        $condition?: string | any
    ) {
        if (this.timeUnits.unit == TimeUnits.Units.DAYS) {
            throw "Timer Exception: Timer metrics not implemented for DAYS in C++";
        }
        var logger = new Logger(false, this.filename);

        if ($end === undefined) {
            $end = $start;
        }

        let $file = $start.ancestor("file");

        // Add include
        $file.addInclude("chrono", true);

        var startVar = IdGenerator.next("clava_timing_start_");
        var endVar = IdGenerator.next("clava_timing_end_");

        var $codeTic = ClavaJoinPoints.stmtLiteral(
            Timer._timer_cpp_now(startVar)
        );
        var $codeToc = ClavaJoinPoints.stmtLiteral(
            Timer._timer_cpp_now(endVar)
        );
        var $insertionTic = $codeTic;
        var $insertionToc = $codeToc;

        if ($condition !== undefined) {
            $insertionTic = ClavaJoinPoints.ifStmt($condition, $codeTic);
            $insertionToc = ClavaJoinPoints.ifStmt($condition, $codeToc);
        }

        var cppUnit = this.timeUnits.getCppTimeUnit();
        if (cppUnit === undefined) {
            throw `[Timer] Unit '${this.timeUnits.getUnitsString}' is not compatible with use of this module`;
        }

        // Declare variable for time interval, which uses calculation as initialization
        var timeIntervalVar = IdGenerator.next("clava_timing_duration_");
        // Create literal node with calculation of time interval
        let $timingResult = ClavaJoinPoints.exprLiteral(
            Timer._timer_cpp_calc_interval(
                startVar,
                endVar,
                cppUnit,
                timeIntervalVar
            )
        );

        // Build message
        logger
            .append(prefix)
            .appendLong(
                Timer._timer_cpp_print_interval(cppUnit, timeIntervalVar)
            );
        if (this.printUnit) {
            logger.append(this.timeUnits.getUnitsString());
        }
        logger.ln();

        // Check if $start is a scope
        if ($start.instanceOf("scope")) {
            $start.insertBegin($insertionTic);
        } else {
            $start.insertBefore($insertionTic);
        }

        let $startVarDecl = ClavaJoinPoints.stmtLiteral(
            Timer._timer_cpp_define_time_var(startVar)
        );
        let $endVarDecl = ClavaJoinPoints.stmtLiteral(
            Timer._timer_cpp_define_time_var(endVar)
        );
        let $timingResultDecl = ClavaJoinPoints.varDeclNoInit(
            timeIntervalVar,
            ClavaJoinPoints.typeLiteral(
                "std::chrono::high_resolution_clock::duration"
            )
        );
        $insertionTic.insertBefore($startVarDecl);
        $insertionTic.insertBefore($endVarDecl);
        $insertionTic.insertBefore($timingResultDecl);

        var afterJp = undefined;

        // Check if $end is a scope
        if ($end.instanceOf("scope")) {
            $end.insertEnd($insertionToc);
        } else {
            $end.insertAfter($insertionToc);
        }
        $codeToc.insertAfter($timingResult);

        if ($condition !== undefined) {
            afterJp = $insertionToc;
        } else {
            afterJp = $timingResult;
        }

        // Log time information
        if (this.print) {
            logger.log($timingResult);
            if ($condition === undefined) {
                afterJp = logger.getAfterJp();
            }
        }

        this.setAfterJp(afterJp);

        return timeIntervalVar;
    }

    _time_c(
        $start: any,
        prefix: string = "",
        $end: any,
        $condition: string | any
    ) {
        var logger = new Logger(false, this.filename);

        if ($end === undefined) {
            $end = $start;
        }

        let $file = $start.ancestor("file");

        var $varDecl, $codeBefore, $codeAfter, $timingResult;

        // Declare variable for time interval, which uses calculation as initialization
        var timeIntervalVar = IdGenerator.next("clava_timing_duration_");
        var $timingResultDecl = ClavaJoinPoints.varDeclNoInit(
            timeIntervalVar,
            ClavaJoinPoints.builtinType("double")
        );

        if (Platforms.isWindows()) {
            //use QueryPerformanceCounter
            // Add includes
            $file.addInclude("time.h", true);
            $file.addInclude("windows.h", true);

            // get variable names
            let startVar = IdGenerator.next("clava_timing_start_");
            let endVar = IdGenerator.next("clava_timing_end_");
            let frequencyVar = IdGenerator.next("clava_timing_frequency_");

            $varDecl = ClavaJoinPoints.stmtLiteral(
                Timer._timer_c_windows_declare_vars(
                    startVar,
                    endVar,
                    frequencyVar
                )
            );
            $codeBefore = ClavaJoinPoints.stmtLiteral(
                Timer._timer_c_windows_get_time(startVar)
            );
            $codeAfter = ClavaJoinPoints.stmtLiteral(
                Timer._timer_c_windows_get_time(endVar)
            );

            // Create literal node with calculation of time interval
            $timingResult = ClavaJoinPoints.exprLiteral(
                Timer._timer_c_windows_calc_interval(
                    startVar,
                    endVar,
                    timeIntervalVar,
                    frequencyVar,
                    this.timeUnits.getMagnitudeFactorFromSeconds()
                ),
                $timingResultDecl.type
            );
        } else if (Platforms.isLinux()) {
            // Add includes
            $file.exec.addInclude("time.h", true);

            // If C99 or C11 standard, needs define at the beginning of the file
            // https://stackoverflow.com/questions/42597685/storage-size-of-timespec-isnt-known
            var needsDefine =
                Clava.getStandard() === "c99" || Clava.getStandard() === "c11";
            if (needsDefine && !this.addedDefines.has($file.location)) {
                $file.exec.insertBegin("#define _POSIX_C_SOURCE 199309L");
                this.addedDefines.add($file.location);
            }

            // get variable names
            let startVar = IdGenerator.next("clava_timing_start_");
            let endVar = IdGenerator.next("clava_timing_end_");

            $varDecl = ClavaJoinPoints.stmtLiteral(
                Timer._timer_c_linux_declare_vars(startVar, endVar)
            );
            $codeBefore = ClavaJoinPoints.stmtLiteral(
                Timer._timer_c_linux_get_time(startVar)
            );
            $codeAfter = ClavaJoinPoints.stmtLiteral(
                Timer._timer_c_linux_get_time(endVar)
            );

            // Create literal node with calculation of time interval
            $timingResult = ClavaJoinPoints.exprLiteral(
                Timer._timer_c_linux_calc_interval(
                    startVar,
                    endVar,
                    timeIntervalVar,
                    this.timeUnits.getMagnitudeFactorFromSeconds()
                ),
                $timingResultDecl.type
            );
        } else {
            throw "Timer Exception: Platform not supported (Windows and Linux only)";
        }

        // Build message
        logger.append(prefix).appendDouble(timeIntervalVar);
        if (this.printUnit) {
            logger.append(this.timeUnits.getUnitsString());
        }
        logger.ln();

        let $insertionTic = $codeBefore;
        let $insertionToc = $codeAfter;

        if ($condition !== undefined) {
            $insertionTic = ClavaJoinPoints.ifStmt($condition, $codeBefore);
            $insertionToc = ClavaJoinPoints.ifStmt($condition, $codeAfter);
        }

        // Check if $start is a scope
        if ($start.instanceOf("scope")) {
            // Insert code
            $start.insertBegin($insertionTic);
        } else {
            // Insert code
            $start.insertBefore($insertionTic);
        }
        $insertionTic.insertBefore($varDecl);
        $insertionTic.insertBefore($timingResultDecl);

        let afterJp = undefined;

        // Check if $end is a scope
        if ($end.instanceOf("scope")) {
            $end.insertEnd($insertionToc);
        } else {
            $end.insertAfter($insertionToc);
        }
        afterJp = $codeAfter.insertAfter($timingResult);

        if ($condition !== undefined) {
            afterJp = $insertionToc;
        } else {
            afterJp = $timingResult;
        }

        // Log time information
        if (this.print) {
            logger.log(afterJp);
            afterJp = logger.getAfterJp();
        }

        this.setAfterJp(afterJp);

        return timeIntervalVar;
    }

    //C codedefs
    // Windows
    static _timer_c_windows_declare_vars(
        timeStartVar: string,
        timeEndVar: string,
        timeFrequencyVar: string
    ) {
        return `LARGE_INTEGER ${timeStartVar}, ${timeEndVar}, ${timeFrequencyVar};
QueryPerformanceFrequency(&${timeFrequencyVar});`;
    }

    static _timer_c_windows_get_time(timeVar: string) {
        return `QueryPerformanceCounter(&${timeVar})`;
    }

    static _timer_c_windows_calc_interval(
        timeStartVar: string,
        timeEndVar: string,
        timeDiffenceVar: string,
        timeFrequencyVar: string,
        factorConversion: string | number
    ) {
        return `${timeDiffenceVar} = ((${timeEndVar}.QuadPart - ${timeStartVar}.QuadPart) / (double)${timeFrequencyVar}.QuadPart) * (${factorConversion})`;
    }

    //Linux
    static _timer_c_linux_declare_vars(
        timeStartVar: string,
        timeEndVar: string
    ) {
        return `struct timespec ${timeStartVar}, ${timeEndVar};`;
    }

    static _timer_c_linux_get_time(timeVar: string) {
        return `clock_gettime(CLOCK_MONOTONIC, &${timeVar});`;
    }

    static _timer_c_linux_calc_interval(
        timeStartVar: string,
        timeEndVar: string,
        timeDiffenceVar: string,
        factorConversion: string | number
    ) {
        return `${timeDiffenceVar} = ((${timeEndVar}.tv_sec + ((double)${timeEndVar}.tv_nsec / 1000000000)) - (${timeStartVar}.tv_sec + ((double)${timeStartVar}.tv_nsec / 1000000000))) * (${factorConversion});`;
    }

    //Cpp codedefs
    static _timer_cpp_define_time_var(timeVar: string) {
        return `std::chrono::high_resolution_clock::time_point ${timeVar};`;
    }

    static _timer_cpp_now(timeVar: string) {
        return `${timeVar} = std::chrono::high_resolution_clock::now();`;
    }

    static _timer_cpp_calc_interval(
        startVar: string,
        endVar: string,
        unit: string,
        differentialVar: string
    ) {
        return `${differentialVar} = ${endVar} - ${startVar}`;
    }

    static _timer_cpp_print_interval(unit: string, differentialVar: string) {
        return `std::chrono::duration_cast<std::chrono::${unit}> (${differentialVar}).count()`;
    }
}
