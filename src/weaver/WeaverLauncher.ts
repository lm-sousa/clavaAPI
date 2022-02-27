import WeaverLauncherBase from "./WeaverLauncherBase";
import Clava from "../clava/Clava";

export default class WeaverLauncher extends WeaverLauncherBase {
    execute(args: string | any[]) {
        return Clava.runClava(args);
    }
}
