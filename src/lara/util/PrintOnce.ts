import { println } from "../../larai/includes/scripts/output";
import StringSet from "./StringSet";

/**
 * @class
 */
class PrintOnce {
    messagesSet = new StringSet();

    message(message: string) {
        if (message === undefined) {
            return;
        }

        if (this.messagesSet.has(message)) {
            return;
        }

        this.messagesSet.add(message);
        println(message);
    }
}

export default new PrintOnce();
