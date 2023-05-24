/**
 * Build a proxy for the Clava data object.
 */
import java from "java";

export function _buildClavaProxy(obj: any, astNode: any = {}, pragma?: any) {
    // Make _node non-enumerable
    Object.defineProperty(obj, "_node", {
        value: astNode,
        writable: true,
        enumerable: false,
    });

    // Make _pragma non-enumerable
    Object.defineProperty(obj, "_pragma", {
        value: pragma,
        writable: true,
        enumerable: false,
    });

    // If hasPragma is undefined, this means the node can never have a pragma.
    // If hasPragma is false, this means the node can have a pragma, but currently has none.
    const acceptsPragmas = java
        .import("pt.up.fe.specs.clava.ClavaNodes")
        .acceptsPragmas(astNode);
    const hasPragma =
        pragma !== undefined ? true : acceptsPragmas ? false : undefined;

    // Make _hasPragma non-enumerable
    Object.defineProperty(obj, "_hasPragma", {
        value: hasPragma,
        writable: true,
        enumerable: false,
    });

    // Define clear
    Object.defineProperty(obj, "_clear", {
        value: function () {
            // for enumerable properties
            for (var key in this) {
                delete this[key];
            }
        },
        writable: true,
        enumerable: false,
    });

    // Define assign
    Object.defineProperty(obj, "_assign", {
        value: function (source: any) {
            // for enumerable properties
            for (var key in source) {
                this[key] = source[key];
            }
        },
        writable: true,
        enumerable: false,
    });

    return new Proxy(obj, _CLAVA_DATA_HANDLER);
}

export const _CLAVA_DATA_PROPS = [
    "_node",
    "_pragma",
    "_hasPragma",
    "_clear",
    "_assign",
];

/**
 * Handler of the Clava data object.
 */
export const _CLAVA_DATA_HANDLER = {
    set: function (obj: any, prop: string, value: any) {
        // Check if attribute is allowed
        if (_CLAVA_DATA_PROPS.includes(prop)) {
            throw new Error(
                "Clava data objects cannot set the property " + prop
            );
        }

        // The default behavior to store the value
        obj[prop] = value;

        // If hasPragma not undefined, update pragma
        if (obj._hasPragma !== undefined) {
            // If it has not pragma but supports it, create pragma
            if (!obj._hasPragma) {
                const newDataPragma = java
                    .import("pt.up.fe.specs.clava.ast.pragma.ClavaData")
                    .buildClavaData(obj._node);
                obj._pragma = newDataPragma;
                obj._hasPragma = true;
            }

            // Create json string
            let jsonString = JSON.stringify(obj);

            obj._pragma.setContent("data " + jsonString);
        }

        return true;
    },
};

let _CLAVA_DATA_CACHE: { [key: string]: any } = {};

export function _getClavaData(astNode: any, obj: any = {}, pragma?: any) {
    const id = astNode.getId();
    let data = _CLAVA_DATA_CACHE[id];

    if (data === undefined) {
        data = _buildClavaProxy(obj, astNode, pragma);
        _CLAVA_DATA_CACHE[id] = data;
    }

    return data;
}

export function _hasClavaData(astNode: any) {
    const id = astNode.getId();

    return _CLAVA_DATA_CACHE.hasOwnProperty(id);
}

export function _clearClavaDataCache(ids?: any[]) {
    // No ids defined, clear all
    if (ids === undefined) {
        _CLAVA_DATA_CACHE = {};
        return;
    }

    for (let id of ids) {
        if (_CLAVA_DATA_CACHE.hasOwnProperty(id)) {
            delete _CLAVA_DATA_CACHE[id];
        }
    }
}
