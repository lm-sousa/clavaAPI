import { defaultValue } from "./LaraCore.js";
import java from "java";

const SpecsPlatforms = java.import("pt.up.fe.specs.lang.SpecsPlatforms");

/**
 * Information about the current platform (e.g., if it is Linux, Windows or Mac)
 *
 * @class
 */
class Platforms {
    _customPlatform: string | undefined = undefined;
    static LINUX = "linux";
    static UNIX = "unix";
    static WINDOWS = "windows";
    static MAC = "mac";

    isWindows() {
        return defaultValue(
            this.#testCustomPlatform(Platforms.WINDOWS),
            SpecsPlatforms.isWindows()
        );
    }

    isLinux() {
        return defaultValue(
            this.#testCustomPlatform(Platforms.LINUX),
            SpecsPlatforms.isLinux()
        );
    }

    isUnix() {
        return defaultValue(
            this.#testCustomPlatform(Platforms.UNIX),
            SpecsPlatforms.isUnix()
        );
    }

    isMac() {
        return defaultValue(
            this.#testCustomPlatform(Platforms.MAC),
            SpecsPlatforms.isMac()
        );
    }

    getPlatformName() {
        return SpecsPlatforms.getPlatformName();
    }

    setLinux() {
        this._customPlatform = Platforms.LINUX;
    }

    setWindows() {
        this._customPlatform = Platforms.WINDOWS;
    }

    setMac() {
        this._customPlatform = Platforms.MAC;
    }

    #testCustomPlatform(platform: string) {
        if (this._customPlatform === undefined) {
            return undefined;
        }

        return this._customPlatform === platform;
    }
}

const PlatformsInstance = new Platforms();

export default PlatformsInstance;
