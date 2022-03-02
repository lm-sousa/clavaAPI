/**
 * @class
 */
var idCounter: { [key: string]: number } = {};
export default class IdGenerator {
    static next(key?: string) {
        if (key === undefined) {
            key = "";
        }

        var currentId = idCounter[key];

        if (currentId === undefined) {
            currentId = 0;
        }

        idCounter[key] = currentId + 1;

        return key + currentId;
    }
}
