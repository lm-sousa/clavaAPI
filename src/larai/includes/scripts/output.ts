import JavaTypes from "../../../lara/JavaTypes.js";

export var INDENT_CHAR = "   ";
export var JAVA_OBJECT_ANNOTATION = "[@Java Object] ";

//export function object2string(obj, space, ommitFunctions){
export function object2string(obj: any, space?: string | undefined): string {
    // ommitFunctions not working, printing more than intended

    if (space === undefined) space = "";

    /*
	if(ommitFunctions === undefined) {
		ommitFunctions = false;
	}
*/
    if (obj === null)
        //since typeof null is "object"
        return space + "null";

    var type = typeof obj;
    if (type === "object") {
        if (Java.isJavaObject(obj)) {
            //			print(space+obj.toString());
            return space + JAVA_OBJECT_ANNOTATION + obj.toString();
        } else if (Array.isArray(obj)) {
            var ar = space + "[\n";
            var content = [];
            for (var prop in obj) {
                var prop2String = object2string(obj[prop], space + INDENT_CHAR);
                //var prop2String = object2string(obj[prop],space+INDENT_CHAR, ommitFunctions);
                content.push(prop2String);
            }
            ar += content.join(",\n");
            ar += "\n" + space + "]";
            return ar;
        } else {
            var ob = space + "{\n";
            var content = [];
            for (var prop in obj) {
                var prop2String = space + INDENT_CHAR + prop + ":\n";
                prop2String += object2string(
                    obj[prop],
                    space + INDENT_CHAR + INDENT_CHAR
                );
                //prop2String += object2string(obj[prop],space+INDENT_CHAR+INDENT_CHAR, ommitFunctions);
                content.push(prop2String);
            }
            ob += content.join(",\n");
            ob += "\n" + space + "}";
            return ob;
        }
        //}else if(type === "function" && (!ommitFunctions)){
    } else if (type === "function") {
        var name = obj.name; // getFnName(obj);
        var params = getFnParamNames(obj);
        return space + "function " + name + "(" + params.join(",") + ")";
    } else {
        return space + obj;
    }
}

export function object2stringSimple(
    obj: any | null,
    space?: string | undefined
) {
    if (space === undefined) space = "";

    if (obj === null)
        //since typeof null is "object"
        return space + "null";

    var type = typeof obj;
    if (type === "object") {
        if (Java.isJavaObject(obj)) {
            //			print(space+obj.toString());
            return space + JAVA_OBJECT_ANNOTATION + obj.toString();
        } else if (Array.isArray(obj)) {
            var ar = space + "[\n";
            var content = [];
            for (var prop in obj) {
                var prop2String = object2stringSimple(
                    obj[prop],
                    space + INDENT_CHAR
                );
                content.push(prop2String);
            }
            ar += content.join(",\n");
            ar += "\n" + space + "]";
            return ar;
        } else {
            var ob = space + "{\n";
            var content = [];
            for (var prop in obj) {
                // Ignore functions
                if (typeof obj[prop] === "function") {
                    continue;
                }

                var prop2String = space + INDENT_CHAR + prop + ":\n";
                prop2String += object2stringSimple(
                    obj[prop],
                    space + INDENT_CHAR + INDENT_CHAR
                );
                content.push(prop2String);
            }
            ob += content.join(",\n");
            ob += "\n" + space + "}";
            return ob;
        }
    } else if (type === "function") {
        var name = obj.name; // getFnName(obj);
        var params = getFnParamNames(obj);
        return space + "function " + name + "(" + params.join(",") + ")";
    } else {
        return space + obj;
    }
}

export function getFnParamNames(fn: string) {
    var fstr = fn.toString();
    const match = fstr.match(/\(.*?\)/);
    if (match === null) {
        return [];
    }
    return match[0].replace(/[()]/gi, "").replace(/\s/gi, "").split(",");
}

export function getFnName(fn: string) {
    var fstr = fn.toString();
    const match = fstr.match(/function (.*)\)/);
    if (match === null) {
        return "";
    }
    return match[0];
}

//Insert save to file functions (and others) here!
export function writeFile(path: string, content: string) {
    var file = new JavaTypes.JavaFile(path.toString());
    JavaTypes.SpecsIo.write(file, content);
    return file;
}

export function JSONtoFile(path: string, object: any) {
    var content = JSON.stringify(object, undefined, "\t");
    writeFile(path, content);
}
