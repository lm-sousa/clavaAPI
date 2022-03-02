import TimeUnits from "../util/TimeUnits";
import { println } from "../../larai/includes/scripts/output";

/**
 * Timer object, for timing sections of code.
 */
class TimerBase {
    timeUnits: TimeUnits;
    filename: string;
    printUnit = true;
    print = true;
    afterJp = undefined;

    constructor(unit: TimerBase.Units, filename: string) {
        this.timeUnits = new TimeUnits(unit);
        this.filename = filename;
    }

    /**
     * Times the code of a given section.
     *
     * @param $start [Mandatory] Starting point of the time measure
     * @param prefix Message that will appear before the time measure. If undefined, empty string will be used.
     * @param $end Ending point of the time measure. If undefined, measure is done around starting point.
     * @return name of the variable that contains the value of the elapsed time.
     */
    time($start: any, prefix: string, $end: any) {
        throw "Timer.time: Not implemented yet";
    }

    /**
     * @param printUnit boolean
     */
    setPrintUnit(printUnit: boolean) {
        this.printUnit = printUnit;
        return this;
    }

    setPrint(print: boolean) {
        this.print = print;
        return this;
    }

    getUnit() {
        return this.timeUnits;
    }

    /**
     * @return the last join point that was inserted after the $end mark
     */
    getAfterJp() {
        return this.afterJp;
    }

    /**
     * Verifies that join point start is not undefined, that it is inside a function.
     * Additionally, if $end is not undefined, checks if it is inside the same function as $start.
     *
     * [Requires] global attribute 'ancestor'.
     *
     * @return true if $start is a valid join point for the 'time' function
     */
    protected timeValidate($start: any, $end: any, functionJpName: string) {
        if ($start === undefined) {
            println("Timer: $start join point is undefined");
            return false;
        }

        var $function = $start.ancestor(functionJpName);

        if ($function === undefined) {
            println(
                "Timer: tried to measure time at join point " +
                    $start.joinPointType +
                    ", but it is not inside a function"
            );
            return false;
        }

        if ($end !== undefined) {
            var $endFunction = $end.ancestor(functionJpName);

            if ($endFunction === undefined) {
                println(
                    "Timer: tried to end measuring time at joinpoit " +
                        $end +
                        ", but it is not inside a function"
                );
                return false;
            }

            // TODO: Checking if it is the same function not implemented yet, requires attribute '$function.id'
        }

        return true;
    }

    /**
     * Sets the join point that should be returned by .getAfterJp().
     */
    protected setAfterJp($afterJp: any) {
        this.afterJp = $afterJp;
    }
}

namespace TimerBase {
    export type Units = TimeUnits.Units;
}

export default TimerBase;
