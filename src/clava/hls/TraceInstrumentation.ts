import Query from "../../weaver/Query.js";
import ClavaJoinPoints from "../ClavaJoinPoints.js";
import Clava from "../Clava.js";
import Logger from "../../lara/code/Logger.js";
import { println } from "../../larai/includes/scripts/output.js";

/**
	Source code assumptions:
	- Arrays have predetermined size
	- No pointers
**/

export default class TraceInstrumentation {
    #interfaces: { [key: string]: string[] } = {};
    #locals: { [key: string]: string[] } = {};
    #logger: Logger = new Logger();
    static #defCounters = ["const", "temp", "op", "mux", "ne"];
    static #CM = '\\"';
    static #NL = "\\n";

    instrument(funName: string) {
        //Get function root
        var root;
        var filename = Clava.getProgram().files[0].name;
        var basename = filename.split(".");
        this.#logger = new Logger(undefined, funName + ".dot");

        for (var elem of Query.search("function").chain()) {
            if (elem["function"].name == funName) root = elem["function"];
        }
        if (root == undefined) {
            println("Function " + funName + " not found, terminating...");
            return;
        }

        //Get scope and interface
        var scope;
        for (var i = 0; i < root.children.length; i++) {
            if (root.children[i].joinPointType == "scope")
                scope = root.children[i];
            if (root.children[i].joinPointType == "param")
                this.#registerInterface(root.children[i]);
        }
        var children = scope.children.slice();

        //Get global vars as interfaces
        for (var elem of Query.search("vardecl")) {
            if (elem.isGlobal) this.#registerInterface(elem);
        }

        //Get local vars
        for (var elem of Query.search("function", { name: funName }).search(
            "vardecl"
        )) {
            this.#registerLocal(elem);
        }

        //Begin graph and create counters
        var firstOp = scope.children[0];
        this.#logger.text("Digraph G {\\n").log(firstOp, true);

        this.createSeparator(firstOp);
        this.#createDefaultCounters(firstOp);
        for (var entry in this.#locals) {
            this.#declareLocalCounter(firstOp, entry);
        }
        for (var entry in this.#interfaces) {
            this.#declareInterfaceCounter(firstOp, entry);
        }

        //Load all interfaces
        for (var inter in this.#interfaces) {
            this.#initializeInterface(firstOp, inter);
        }
        this.createSeparator(firstOp);

        //Go through each statement and generate nodes and edges
        this.#explore(children);

        //Close graph
        this.#logger
            .text("}")
            .log(scope.children[scope.children.length - 1], true);
    }

    #explore(children: any[]) {
        for (var i = 0; i < children.length; i++) {
            var child = children[i];
            //if (child.joinPointType == "statement") {
            if (child.instanceOf("statement")) {
                if (child.children.length == 1) {
                    this.#handleStatement(child.children[0]);
                }
                if (child.children.length > 1) {
                    if (child.children[0].joinPointType == "vardecl") {
                        for (var j = 0; j < child.children.length; j++)
                            this.#handleStatement(child.children[j]);
                    }
                }
            }
            if (child.joinPointType == "loop") {
                this.#explore(child.children[3].children.slice());
            }
        }
    }

    //--------------------
    // Counters
    //--------------------
    #createDefaultCounters(node: any) {
        for (var i = 0; i < TraceInstrumentation.#defCounters.length; i++)
            node.insertBefore(
                ClavaJoinPoints.stmtLiteral(
                    "int n_" + TraceInstrumentation.#defCounters[i] + " = 0;"
                )
            );
    }

    #declareInterfaceCounter(node: any, name: string) {
        var info = this.#interfaces[name];
        var init = info.length == 1 ? " = 0;" : " = {0};";
        node.insertBefore(
            ClavaJoinPoints.stmtLiteral(
                "int " + this.#getCounterOfVar(name, info) + init
            )
        );
    }

    #declareLocalCounter(node: any, name: string) {
        var info = this.#locals[name];
        var init = info.length == 1 ? " = 0;" : " = {0};";
        node.insertBefore(
            ClavaJoinPoints.stmtLiteral(
                "int " + this.#getCounterOfVar(name, info) + init
            )
        );
    }

    #splitMulti(str: string, tokens: string[]) {
        var tempChar = tokens[0];
        for (var i = 1; i < tokens.length; i++) {
            str = str.split(tokens[i]).join(tempChar);
        }
        const splitStr = str.split(tempChar);
        var newStr = [];
        for (var i = 0; i < splitStr.length; i++) {
            if (splitStr[i] != "") newStr.push(splitStr[i]);
        }
        return newStr;
    }

    #filterCommonKeywords(value: string, index: number, arr: string[]) {
        const common = ["const", "static", "unsigned"];
        return !common.includes(value);
    }

    #registerInterface(param: any) {
        var tokens = this.#splitMulti(param.code, [" ", "]", "["]);
        if (tokens.indexOf("=") != -1)
            tokens = tokens.slice(0, tokens.indexOf("="));
        tokens = tokens.filter(this.#filterCommonKeywords);
        var interName = tokens[1];
        tokens.splice(1, 1);
        if (this.#interfaces[interName] != undefined) return;
        this.#interfaces[interName] = tokens;
    }

    #registerLocal(local: any) {
        var tokens = this.#splitMulti(local.code, [" ", "]", "["]);
        if (tokens.indexOf("=") != -1)
            tokens = tokens.slice(0, tokens.indexOf("="));
        tokens = tokens.filter(this.#filterCommonKeywords);
        var locName = tokens[1];
        tokens.splice(1, 1);
        if (this.#interfaces[locName] != undefined) return;
        if (this.#locals[locName] != undefined) return;
        this.#locals[locName] = tokens;
    }

    #getCounterOfVar(name: string, info: string[]) {
        var str = "n_" + name;
        for (var i = 1; i < info.length; i++) str += "[" + info[i] + "]";
        return str;
    }

    #isLocal(varName: string) {
        return this.#locals[varName] != undefined;
    }

    #isInterface(varName: string) {
        return this.#interfaces[varName] != undefined;
    }

    //--------------------
    // Create nodes
    //--------------------
    #refCounter(name: string) {
        name = "n_" + name;
        return ClavaJoinPoints.varRef(name, ClavaJoinPoints.builtinType("int"));
    }

    #refArrayCounter(name: string, indexes: string[]) {
        name = "n_" + name;
        for (var i = 0; i < indexes.length; i++) name += "[" + indexes[i] + "]";
        return ClavaJoinPoints.stmtLiteral(name);
    }

    #refAnyExpr(code: string) {
        return ClavaJoinPoints.stmtLiteral(code);
    }

    #incrementCounter(node: any, variable: string, indexes?: string[]) {
        if (indexes != undefined) {
            var access = "";
            for (var i = 0; i < indexes.length; i++) {
                access += "[" + indexes[i] + "]";
            }
            node.insertBefore(
                ClavaJoinPoints.stmtLiteral("n_" + variable + access + "++;")
            );
        } else {
            node.insertBefore(
                ClavaJoinPoints.stmtLiteral("n_" + variable + "++;")
            );
        }
    }

    #storeVar(node: any, variable: string) {
        this.#incrementCounter(node, variable);
        var att1 = "var";
        var att2 = "";
        var att3 = "";
        if (this.#isLocal(variable)) {
            att2 = "loc";
            att3 = this.#locals[variable][0];
        }
        if (this.#isInterface(variable)) {
            att2 = "inte";
            att3 = this.#interfaces[variable][0];
        }
        this.#logger
            .text(TraceInstrumentation.#CM + variable + "_")
            .int(this.#refCounter(variable))
            .text(
                TraceInstrumentation.#CM +
                    " [label=" +
                    TraceInstrumentation.#CM +
                    variable +
                    TraceInstrumentation.#CM +
                    ", att1=" +
                    att1 +
                    ", att2=" +
                    att2 +
                    ", att3=" +
                    att3 +
                    "];" +
                    TraceInstrumentation.#NL
            )
            .log(node, true);
    }

    #storeArray(node: any, variable: string, indexes: string[]) {
        this.#incrementCounter(node, variable, indexes);
        var att1 = "var";
        var att2 = "";
        var att3 = "";
        if (this.#isLocal(variable)) {
            att2 = "loc";
            att3 = this.#locals[variable][0];
        }
        if (this.#isInterface(variable)) {
            att2 = "inte";
            att3 = this.#interfaces[variable][0];
        }
        this.#logger.text(TraceInstrumentation.#CM + variable);
        for (var i = 0; i < indexes.length; i++) {
            this.#logger.text("[").int(this.#refAnyExpr(indexes[i])).text("]");
        }
        this.#logger
            .text("_")
            .int(this.#refArrayCounter(variable, indexes))
            .text("_l" + TraceInstrumentation.#CM);
        this.#logger.text(" [label=" + TraceInstrumentation.#CM + variable);
        for (var i = 0; i < indexes.length; i++) {
            this.#logger.text("[").int(this.#refAnyExpr(indexes[i])).text("]");
        }
        this.#logger
            .text(
                TraceInstrumentation.#CM +
                    ", att1=" +
                    att1 +
                    ", att2=" +
                    att2 +
                    ", att3=" +
                    att3 +
                    "];" +
                    TraceInstrumentation.#NL
            )
            .log(node, true);
    }

    #createOp(node: any, op: string) {
        this.#incrementCounter(node, "op");
        this.#logger
            .text(TraceInstrumentation.#CM + "op")
            .int(this.#refCounter("op"))
            .text(
                TraceInstrumentation.#CM +
                    " [label=" +
                    TraceInstrumentation.#CM +
                    op +
                    TraceInstrumentation.#CM +
                    ", att1=op];" +
                    TraceInstrumentation.#NL
            )
            .log(node, true);
    }

    #createMux(node: any) {
        //TODO: include OP attribute?
        this.#incrementCounter(node, "mux");
        this.#logger
            .text(TraceInstrumentation.#CM + "mux")
            .int(this.#refCounter("mux"))
            .text(
                TraceInstrumentation.#CM +
                    " [label=" +
                    TraceInstrumentation.#CM +
                    "mux"
            )
            .int(this.#refCounter("mux"))
            .text(
                TraceInstrumentation.#CM +
                    ", att1=mux];" +
                    TraceInstrumentation.#NL
            )
            .log(node, true);
    }

    #createConst(node: any, num: string) {
        this.#incrementCounter(node, "const");
        this.#logger
            .text(TraceInstrumentation.#CM + "const")
            .int(this.#refCounter("const"))
            .text(
                TraceInstrumentation.#CM +
                    " [label=" +
                    TraceInstrumentation.#CM +
                    parseInt(num) +
                    TraceInstrumentation.#CM +
                    ", att1=const];" +
                    TraceInstrumentation.#NL
            )
            .log(node, true);
    }

    #createTemp(node: any, type: string) {
        this.#incrementCounter(node, "temp");
        this.#logger
            .text(TraceInstrumentation.#CM + "temp")
            .int(this.#refCounter("temp"))
            .text(
                TraceInstrumentation.#CM +
                    " [label=" +
                    TraceInstrumentation.#CM +
                    "temp"
            )
            .int(this.#refCounter("temp"))
            .text(
                TraceInstrumentation.#CM +
                    ", att1=var, att2=loc, att3=" +
                    type +
                    "];" +
                    TraceInstrumentation.#NL
            )
            .log(node, true);
    }

    createSeparator(node: any) {
        var separator = "//---------------------";
        node.insertBefore(ClavaJoinPoints.stmtLiteral(separator));
    }

    //--------------------
    // Create edges
    //--------------------
    #createEdge(
        node: any,
        source: string[],
        dest: string[],
        pos?: string,
        offset?: string
    ) {
        this.#incrementCounter(node, "ne");
        this.#logger.text(TraceInstrumentation.#CM);
        if (source.length == 1) {
            if (TraceInstrumentation.#defCounters.includes(source[0])) {
                if (source[0] == "temp" && offset != undefined)
                    this.#logger
                        .text(source[0])
                        .int(this.#refAnyExpr("n_temp" + offset));
                else
                    this.#logger
                        .text(source[0])
                        .int(this.#refCounter(source[0]));
            } else
                this.#logger
                    .text(source[0])
                    .text("_")
                    .int(this.#refCounter(source[0]));
        } else {
            this.#logger.text(source[0]);
            for (var i = 1; i < source.length; i++)
                this.#logger
                    .text("[")
                    .int(this.#refAnyExpr(source[i]))
                    .text("]");
            this.#logger
                .text("_")
                .int(this.#refArrayCounter(source[0], source.slice(1)))
                .text("_l");
        }
        this.#logger.text(
            TraceInstrumentation.#CM + " -> " + TraceInstrumentation.#CM
        );
        if (dest.length == 1) {
            if (TraceInstrumentation.#defCounters.includes(dest[0])) {
                if (dest[0] == "temp" && offset != undefined)
                    this.#logger
                        .text(dest[0])
                        .int(this.#refAnyExpr("n_temp" + offset));
                else this.#logger.text(dest[0]).int(this.#refCounter(dest[0]));
            } else
                this.#logger
                    .text(dest[0])
                    .text("_")
                    .int(this.#refCounter(dest[0]));
        } else {
            this.#logger.text(dest[0]);
            for (var i = 1; i < dest.length; i++)
                this.#logger.text("[").int(this.#refAnyExpr(dest[i])).text("]");
            this.#logger
                .text("_")
                .int(this.#refArrayCounter(dest[0], dest.slice(1)))
                .text("_l");
        }
        this.#logger
            .text(
                TraceInstrumentation.#CM + " [label=" + TraceInstrumentation.#CM
            )
            .int(this.#refCounter("ne"))
            .text(
                TraceInstrumentation.#CM + ", ord=" + TraceInstrumentation.#CM
            )
            .int(this.#refCounter("ne"));
        if (pos != undefined)
            this.#logger.text(
                TraceInstrumentation.#CM +
                    ", pos=" +
                    TraceInstrumentation.#CM +
                    pos
            );
        this.#logger
            .text(TraceInstrumentation.#CM + "];" + TraceInstrumentation.#NL)
            .log(node, true);
    }

    //--------------------
    // Handle statements
    //--------------------
    #handleStatement(node: any) {
        var type = node.joinPointType;
        this.createSeparator(node);
        if (type == "vardecl") this.#handleVardecl(node);
        if (type == "binaryOp") this.#handleAssign(node);
        if (type == "unaryOp") this.#handleUnaryOp(node);
        this.createSeparator(node);
    }

    #handleVardecl(node: any) {
        //Not contemplating arrays, TODO if necessary
        if (node.children.length != 1) return;
        var info = this.#getInfo(node.children[0]);
        this.#storeVar(node, node.name);
        this.#createEdge(node, info, [node.name]);
    }

    #handleAssign(node: any) {
        //Build rhs node(s)
        var rhsInfo = this.#getInfo(node.right);

        //Build lhs node
        var lhsInfo = this.#getInfo(node.left);

        //If assignment, load extra node and build op
        if (node.kind.includes("_")) {
            var opKind = this.#mapOperation(node.kind);
            this.#createOp(node, opKind);
            if (rhsInfo[0] == "temp" && lhsInfo[0] == "temp")
                this.#createEdge(node, rhsInfo, ["op"], "r", "-1");
            else this.#createEdge(node, rhsInfo, ["op"], "r");
            this.#createEdge(node, lhsInfo, ["op"], "l");
            rhsInfo = ["op"];
        }

        if (node.left.joinPointType == "arrayAccess") {
            this.#storeArray(node, lhsInfo[0], lhsInfo.slice(1));
        }
        if (node.left.joinPointType == "varref") {
            this.#storeVar(node, lhsInfo[0]);
        }

        //Create assignment edge
        this.#createEdge(node, rhsInfo, lhsInfo);
    }

    #handleUnaryOp(node: any) {
        if (node.kind.includes("pre") || node.kind.includes("post")) {
            this.#createOp(node, this.#mapOperation(node.kind));
            var info = this.#handleVarref(node.children[0]);
            this.#createConst(node, "1");
            this.#createEdge(node, ["const"], ["op"], "r");
            this.#createEdge(node, info, ["op"], "l");
            this.#storeVar(node, info[0]);
            this.#createEdge(node, ["op"], info);
        } else return ["const"];
    }

    #handleVarref(node: any) {
        return [node.name];
    }

    #handleArrayAccess(node: any) {
        var info = [node.arrayVar.name];
        for (var i = 0; i < node.subscript.length; i++)
            info.push(node.subscript[i].code);
        return info;
    }

    #handleBinaryOp(node: any) {
        //Build rhs
        var rhsInfo = this.#getInfo(node.right);

        //Build lhs
        var lhsInfo = this.#getInfo(node.left);

        //Build op
        var opKind = this.#mapOperation(node.kind);
        this.#createOp(node, opKind);
        if (rhsInfo[0] == "temp" && lhsInfo[0] == "temp")
            this.#createEdge(node, rhsInfo, ["op"], "r", "-1");
        else this.#createEdge(node, rhsInfo, ["op"], "r");
        this.#createEdge(node, lhsInfo, ["op"], "l");

        //Build temp
        this.#createTemp(node, "float");
        this.#createEdge(node, ["op"], ["temp"]);
        return ["temp"];
    }

    #getInfo(node: any) {
        var info = ["null"];
        if (node.joinPointType == "varref") info = this.#handleVarref(node);
        if (node.joinPointType == "binaryOp") info = this.#handleBinaryOp(node);
        if (node.joinPointType == "arrayAccess")
            info = this.#handleArrayAccess(node);
        if (node.joinPointType == "expression")
            info = this.#handleExpression(node);
        return info;
    }

    #handleExpression(node: any) {
        if (
            node.children.length == 3 &&
            node.children[0].joinPointType == "expression"
        ) {
            //Build comparison
            var cmpInfo = this.#getInfo(node.children[0].children[0]);

            //Build true value
            var trueInfo = this.#getInfo(node.children[1]);

            //Build false value
            var falseInfo = this.#getInfo(node.children[2]);

            //Build multiplexer
            this.#createMux(node);
            this.#createEdge(node, cmpInfo, ["mux"], "sel");
            this.#createEdge(node, trueInfo, ["mux"], "t");
            this.#createEdge(node, falseInfo, ["mux"], "f");
            return ["mux"];
        }
        if (node.children.length == 1) return this.#getInfo(node.children[0]);
        if (node.children.length == 0) {
            this.#createConst(node, node.code);
            return ["const"];
        }
        return ["null"];
    }

    //--------------------
    // Utils
    //--------------------
    #mapOperation(op: string) {
        switch (op) {
            case "mul":
                return "*";
            case "div":
                return "/";
            case "rem":
                return "%";
            case "add":
                return "+";
            case "sub":
                return "-";
            case "shl":
                return "<<";
            case "shr":
                return ">>";
            case "cmp":
                return "cmp";
            case "lt":
                return "<";
            case "gt":
                return ">";
            case "le":
                return "<=";
            case "ge":
                return ">=";
            case "eq":
                return "==";
            case "ne":
                return "!=";
            case "and":
                return "&";
            case "xor":
                return "^";
            case "or":
                return "|";
            case "l_and":
                return "&&";
            case "l_or":
                return "||";
            case "assign":
                return "=";
            case "mul_assign":
                return "*";
            case "rem_assign":
                return "%";
            case "add_assign":
                return "+";
            case "sub_assign":
                return "-";
            case "shl_assign":
                return "<<";
            case "shr_assign":
                return ">>";
            case "and_assign":
                return "&&";
            case "xor_assign":
                return "^";
            case "or_assign":
                return "||";
            case "post_int":
                return "+";
            case "post_dec":
                return "-";
            case "pre_inc":
                return "+";
            case "pre_dec":
                return "-";
        }
        return op;
    }

    #initializeInterface(node: any, variable: string) {
        var level = 0;
        var stmt = "";
        var info = [];
        var indexes = ["_i", "_j", "_k", "_l", "_m", "_n"];
        for (var i = 1; i < this.#interfaces[variable].length; i++) {
            stmt +=
                "for (int " +
                indexes[level] +
                " = 0; " +
                indexes[level] +
                " < " +
                this.#interfaces[variable][i] +
                "; " +
                indexes[level] +
                "++) {\n";
            info.push(indexes[level]);
            level++;
        }
        node.insertBefore(ClavaJoinPoints.stmtLiteral(stmt));

        if (level != 0) this.#storeArray(node, variable, info);
        else this.#storeVar(node, variable);

        stmt = "";
        for (var i = 0; i < level; i++) stmt += "}\n";
        node.insertBefore(ClavaJoinPoints.stmtLiteral(stmt));
    }
}
