import TimerBase from "./TimerBase";
import Logger from "./Logger";
import IdGenerator from "../util/IdGenerator";
import TimeUnits from "../util/TimeUnits";
import ClavaJoinPoints from "../../clava/ClavaJoinPoints";
import StringSet from "../util/StringSet";
import { println } from "../../larai/includes/scripts/output";
import Platforms from "../Platforms";
import Clava from "../../clava/Clava";

export default class Timer extends TimerBase {
    addedDefines = new StringSet();

    /**
     * Times the code of a given section.
     *
     * @param $start [Mandatory] Starting point of the time measure
     * @param prefix Message that will appear before the time measure. If undefined, empty string will be used.
     * @param $end Ending point of the time measure. If undefined, measure is done around starting point.
     */
    time($start: any, prefix?: string, $end?: any) {
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
            return this._time_cpp($start, prefix, $end);
        } else {
            return this._time_c($start, prefix, $end);
        }

        //return this;
        //PrintOnce.message("Timer.time: not implemented yet for C");
    }

    _time_cpp($start: any, prefix?: string, $end?: any) {
        if (this.timeUnits.unit == TimeUnits.Units.DAYS) {
            throw "Timer Exception: Timer metrics not implemented for DAYS in C++";
        }
        var logger = new Logger(false, this.filename);

        // Build prefix
        if (prefix === undefined) {
            prefix = "";
        }

        if ($end === undefined) {
            $end = $start;
        }

        var $file = $start.ancestor("file");

        // Add include
        $file.addInclude("chrono", true);

        var startVar = IdGenerator.next("clava_timing_start_");
        var endVar = IdGenerator.next("clava_timing_end_");

        var codeTic = Timer.#timer_cpp_now(startVar);
        var codeToc = Timer.#timer_cpp_now(endVar);

        var cppUnit = this.timeUnits.getCppTimeUnit();

        if (cppUnit === undefined) {
            throw `[Timer] Unit '${this.timeUnits.getUnitsString}' is not compatible with use of this module`;
        }

        // Create literal node with calculation of time interval
        var $timingResult = ClavaJoinPoints.exprLiteral(
            Timer.#timer_cpp_calc_interval(startVar, endVar, cppUnit)
        );

        // Declare variable for time interval, which uses calculation as initialization
        var timeIntervalVar = IdGenerator.next("clava_timing_duration_");
        var $timingResultDecl = ClavaJoinPoints.varDecl(
            timeIntervalVar,
            $timingResult
        );

        // Build message
        logger.append(prefix).appendDouble(timeIntervalVar);
        if (this.printUnit) {
            logger.append(this.timeUnits.getUnitsString());
        }
        logger.ln();

        // Check if $start is a scope
        if ($start.instanceOf("scope")) {
            // Insert code
            $start.insertBegin(codeTic);
        } else {
            // Insert code
            $start.insertBefore(codeTic);
        }

        var afterJp = undefined;

        // Check if $end is a scope
        if ($end.instanceOf("scope")) {
            // 'insertEnd' insertions must be done in sequential order
            $end.insertEnd(codeToc);
            afterJp = $end.insertEnd($timingResultDecl);
        } else {
            // 'insertAfter' insertions must be done in reverse order
            afterJp = $end.insertAfter($timingResultDecl);
            $end.insertAfter(codeToc);
        }

        // Log time information
        if (this.print) {
            logger.log($timingResultDecl);
            afterJp = logger.getAfterJp();
        }

        this.setAfterJp(afterJp);

        return timeIntervalVar;
    }

    _time_c($start: any, prefix?: string, $end?: any) {
        var logger = new Logger(false, this.filename);

        // Build prefix
        if (prefix === undefined) {
            prefix = "";
        }

        if ($end === undefined) {
            $end = $start;
        }

        var $file = $start.ancestor("file");

        var codeBefore, codeAfter;

        // Declare variable for time interval, which uses calculation as initialization
        var timeIntervalVar = IdGenerator.next("clava_timing_duration_");
        var $timingResultDecl;

        if (Platforms.isWindows()) {
            //use QueryPerformanceCounter
            // Add includes
            $file.addInclude("time.h", true);
            $file.addInclude("windows.h", true);

            // get variable names
            var startVar = IdGenerator.next("clava_timing_start_");
            var endVar = IdGenerator.next("clava_timing_end_");
            var frequencyVar = IdGenerator.next("clava_timing_frequency_");

            codeBefore = Timer.#timer_c_windows_declare_vars_now(
                startVar,
                endVar,
                frequencyVar
            );
            codeAfter = Timer.#timer_c_windows_get_final_time(endVar);

            // Create literal node with calculation of time interval
            var $timingResult = ClavaJoinPoints.exprLiteral(
                Timer.#timer_c_windows_calc_interval(
                    startVar,
                    endVar,
                    frequencyVar,
                    this.timeUnits.getMagnitudeFactorFromSeconds()
                ),
                ClavaJoinPoints.builtinType("double")
            );

            $timingResultDecl = ClavaJoinPoints.varDecl(
                timeIntervalVar,
                $timingResult
            );
        } else if (Platforms.isLinux()) {
            // Add includes
            $file.addInclude("time.h", true);

            // If C99 or C11 standard, needs define at the beginning of the file
            // https://stackoverflow.com/questions/42597685/storage-size-of-timespec-isnt-known
            var needsDefine =
                Clava.getStandard() === "c99" || Clava.getStandard() === "c11";
            if (needsDefine && !this.addedDefines.has($file.location)) {
                $file.insertBegin("#define _POSIX_C_SOURCE 199309L");
                this.addedDefines.add($file.location);
            }

            // get variable names
            var startVar = IdGenerator.next("clava_timing_start_");
            var endVar = IdGenerator.next("clava_timing_end_");

            codeBefore = Timer.#timer_c_linux_declare_vars_now(
                startVar,
                endVar
            );
            codeAfter = Timer.#timer_c_linux_get_final_time(endVar);

            // Create literal node with calculation of time interval
            var $timingResult = ClavaJoinPoints.exprLiteral(
                Timer.#timer_c_linux_calc_interval(
                    startVar,
                    endVar,
                    this.timeUnits.getMagnitudeFactorFromSeconds()
                ),
                ClavaJoinPoints.builtinType("double")
            );

            $timingResultDecl = ClavaJoinPoints.varDecl(
                timeIntervalVar,
                $timingResult
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

        // Check if $start is a scope
        if ($start.instanceOf("scope")) {
            // Insert code
            $start.insertBegin(codeBefore);
        } else {
            // Insert code
            $start.insertBefore(codeBefore);
        }

        var afterJp = undefined;

        // Check if $end is a scope
        if ($end.instanceOf("scope")) {
            // 'insertEnd' insertions must be done in sequential order
            $end.insertEnd(codeAfter);
            afterJp = $end.insertEnd($timingResultDecl);
        } else {
            // 'insertAfter' insertions must be done in reverse order
            afterJp = $end.insertAfter($timingResultDecl);
            $end.insertAfter(codeAfter);
        }

        // Log time information
        if (this.print) {
            logger.log($timingResultDecl);
            afterJp = logger.getAfterJp();
        }

        this.setAfterJp(afterJp);

        return timeIntervalVar;
    }

    //C codedefs
    // Windows
    static #timer_c_windows_declare_vars_now(
        timeStartVar: string,
        timeEndVar: string,
        timeFrequencyVar: string
    ) {
        return `LARGE_INTEGER ${timeStartVar}, ${timeEndVar}, ${timeFrequencyVar};
QueryPerformanceFrequency(&${timeFrequencyVar});
QueryPerformanceCounter(&${timeStartVar});`;
    }

    static #timer_c_windows_get_final_time(timeEndVar: string) {
        return `QueryPerformanceCounter(&${timeEndVar});`;
    }

    static #timer_c_windows_calc_interval(
        timeStartVar: string,
        timeEndVar: string,
        timeFrequencyVar: string,
        factorConversion: string | number
    ) {
        return `((${timeEndVar}.QuadPart-${timeStartVar}.QuadPart) / (double)${timeFrequencyVar}.QuadPart) * (${factorConversion})`;
    }

    //Linux
    static #timer_c_linux_declare_vars_now(
        timeStartVar: string,
        timeEndVar: string
    ) {
        return `struct timespec ${timeStartVar}, ${timeEndVar};
clock_gettime(CLOCK_MONOTONIC, &${timeStartVar});`;
    }

    static #timer_c_linux_get_final_time(timeEndVar: string) {
        return `clock_gettime(CLOCK_MONOTONIC, &${timeEndVar});`;
    }

    static #timer_c_linux_calc_interval(
        timeStartVar: string,
        timeEndVar: string,
        factorConversion: string | number
    ) {
        return `((${timeEndVar}.tv_sec + ((double) ${timeEndVar}.tv_nsec / 1000000000)) - (${timeStartVar}.tv_sec + ((double) ${timeStartVar}.tv_nsec / 1000000000))) * (${factorConversion})`;
    }

    //Cpp codedefs
    static #timer_cpp_now(timeVar: string) {
        return `std::chrono::high_resolution_clock::time_point ${timeVar} = std::chrono::high_resolution_clock::now();`;
    }

    static #timer_cpp_calc_interval(
        startVar: string,
        endVar: string,
        unit: string
    ) {
        return `std::chrono::duration_cast<std::chrono::${unit}>(${endVar} - ${startVar}).count()`;
    }
}
