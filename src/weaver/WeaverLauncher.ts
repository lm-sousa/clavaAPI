import WeaverLauncherBase from "./WeaverLauncherBase.js";
import Clava from "../clava/Clava.js";

export default class WeaverLauncher extends WeaverLauncherBase {
    execute(args: string | any[]) {
        return Clava.runClava(args);
    }
}
