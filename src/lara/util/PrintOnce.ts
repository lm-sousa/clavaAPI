import StringSet from "./StringSet.js";

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
        console.log(message);
    }
}

export default new PrintOnce();
