class TimeUnits {
    unit: TimeUnits.Units;

    constructor(unit: TimeUnits.Units = TimeUnits.Units.MILLISECONDS) {
        this.unit = unit;
    }

    getUnitsString() {
        return TimeUnits.unitsString[this.unit];
    }
    getCppTimeUnit() {
        return TimeUnits.cppTimeUnit[this.unit];
    }
    getMagnitudeFactorFromSeconds() {
        return TimeUnits.magnitudeFactorSeconds[this.unit];
    }
    getMagnitudeFactorFromNanoseconds() {
        return TimeUnits.magnitudeFactorNanoseconds[this.unit];
    }

    toNanos(duration: number): number {
        return duration * TimeUnits.magnitudeFactorNanoseconds[this.unit];
    }
}

namespace TimeUnits {
    // Enum representing available time units
    export enum Units {
        NANOSECONDS = 1,
        MICROSECONDS = 2,
        MILLISECONDS = 3,
        SECONDS = 4,
        MINUTES = 5,
        HOURS = 6,
        DAYS = 7,
    }

    // C++ std::chrono macros
    export const cppTimeUnit: { [key in Units]: string | undefined } = {
        [Units.NANOSECONDS]: "nanoseconds",
        [Units.MICROSECONDS]: "microseconds",
        [Units.MILLISECONDS]: "milliseconds",
        [Units.SECONDS]: "seconds",
        [Units.MINUTES]: "minutes",
        [Units.HOURS]: "hours",
        [Units.DAYS]: undefined,
    };

    // units string value for output
    export const unitsString: { [key in Units]: string } = {
        [Units.NANOSECONDS]: "ns",
        [Units.MICROSECONDS]: "us",
        [Units.MILLISECONDS]: "ms",
        [Units.SECONDS]: "s",
        [Units.MINUTES]: "minutes",
        [Units.HOURS]: "hours",
        [Units.DAYS]: "days",
    };

    // C conversion from seconds to other magintudes through multiplication
    export const magnitudeFactorSeconds: { [key in Units]: string | number } = {
        [Units.NANOSECONDS]: 1000000000,
        [Units.MICROSECONDS]: 1000000,
        [Units.MILLISECONDS]: 1000,
        [Units.SECONDS]: 1,
        [Units.MINUTES]: "1/60",
        [Units.HOURS]: "1/3600",
        [Units.DAYS]: "1/86400",
    };

    // Java conversion from nanoseconds to other magintudes through multiplication
    export const magnitudeFactorNanoseconds: { [key in Units]: number } = {
        [Units.NANOSECONDS]: 1,
        [Units.MICROSECONDS]: 1000,
        [Units.MILLISECONDS]: 1000000,
        [Units.SECONDS]: 1000000000,
        [Units.MINUTES]: 60000000000,
        [Units.HOURS]: 3600000000000,
        [Units.DAYS]: 86400000000000,
    };
}

export default TimeUnits;
