import Query from "../../weaver/Query.js";
import OpsBlock from "./OpsBlock.js";
import StringSet from "../../lara/util/StringSet.js";
import PrintOnce from "../../lara/util/PrintOnce.js";
import { println } from "../../larai/includes/scripts/output.js";

export default class StaticOpsCounter {
    // Whitelist of ops
    static #validOps = new StringSet(
        "mul",
        "div",
        "rem",
        "add",
        "sub",
        "shl",
        "shr",
        "cmp",
        "and",
        "xor",
        "or",
        "l_and",
        "l_or",
        "mul_assign",
        "div_assign",
        "rem_assign",
        "add_assign",
        "sub_assign",
        "shl_assign",
        "shr_assign",
        "and_assign",
        "xor_assign",
        "or_assign",
        "post_inc",
        "post_dec",
        "pre_inc",
        "pre_dec"
    );

    #instrumentedFunctions = new StringSet();
    #filterFunction: undefined | (($op: any) => boolean);

    constructor(filterFunction?: ($op: any) => boolean) {
        this.#filterFunction = filterFunction;
        if (filterFunction !== undefined) {
            println("StaticOpsCounter: filter function set");
        }
    }

    count($function: any, opsBlock: OpsBlock, includeOpKind: boolean = false) {
        $function = $function.instanceOf("function")
            ? $function
            : $function.ancestor("function");

        if ($function === undefined) {
            PrintOnce.message(
                "StaticOpsCounter.count: Could not find function corresponding to the join point " +
                    $function.location
            );
            return;
        }

        var functionId = $function.name + "@" + $function.location;

        // Check if it is already instrumented
        // println("ID: " + $function.location);
        if (this.#instrumentedFunctions.has(functionId)) {
            // if(this.#instrumentedFunctions.has($function.jpId)) {
            // Not working yet
            /*
            if(opsBlock === undefined) {
                println("Expected opsBlock to be defined!");
            } else {
                opsBlock.isRecursive = true;
            }
            */

            return;
        }

        this.#instrumentedFunctions.add(functionId);

        println(
            "StaticOpsCounter.count: Estimating ops of function " + functionId
        );

        // var opsBlock = new OpsBlock(functionId);
        opsBlock = opsBlock !== undefined ? opsBlock : new OpsBlock(functionId);

        // Go statement-by-statement
        var stmts = $function.body.children;

        for (var $stmt of stmts) {
            this.#countOpStatic($stmt, opsBlock, includeOpKind);
        }

        return opsBlock;
    }

    #countOpStatic($stmt: any, opsBlock: OpsBlock, includeOpKind: boolean) {
        // If stmt is a loop, count new block, recursively

        if ($stmt == undefined) {
            return;
        }

        if ($stmt.instanceOf("loop")) {
            if ($stmt.kind !== "for") {
                println(
                    "Ignoring loops that are not 'fors' (location " +
                        $stmt.location +
                        ") for now"
                );
                return;
            }

            var rank = $stmt.rank;
            var nestedId = opsBlock.id + " => " + rank[rank.length - 1];

            // Create block for loop
            var nestedOpsBlock = new OpsBlock(nestedId);

            this.#countOpStatic($stmt.init, opsBlock, includeOpKind);
            this.#countOpStatic($stmt.cond, nestedOpsBlock, includeOpKind);
            this.#countOpStatic($stmt.step, nestedOpsBlock, includeOpKind);

            // Extract iterations
            var iter = $stmt.iterationsExpr;
            do {
                var replacementsMap = this.#analyseIterationsExpr(iter, $stmt);

                for (let rep in replacementsMap) {
                    for (var $jp of iter.descendants) {
                        if ($jp.code === rep) {
                            $jp.replaceWith(replacementsMap[rep]); // TODO: Do calculation without altering the source code.
                        }
                    }
                }
            } while (Object.keys(replacementsMap).length > 0);
            nestedOpsBlock.repetitions = iter.code;

            // Add to nested blocks
            opsBlock.nestedOpsBlocks.push(nestedOpsBlock);

            // Go statement-by-statement
            var nestedStmts = $stmt.body.children;

            for (var $nestedStmt of nestedStmts) {
                this.#countOpStatic($nestedStmt, nestedOpsBlock, includeOpKind);
            }

            return;
        }

        // If stmt is not a loop, count ops
        // Apply to all ops found in the stmt
        for (var $op of Query.searchFrom($stmt, "op")) {
            // If not a valid op, continue
            if (!this.#isValidOp($op)) {
                continue;
            }

            // println("Op ("+$op.kind+"): " + $op.code);

            // Calculate type and bitwidth
            var $builtinType = this.#toBuiltinType($op.type);
            var counterType = this.#getCounterType($builtinType);
            var bitwidth =
                $builtinType !== undefined
                    ? $builtinType.bitWidth($op)
                    : undefined;

            // Increment counter
            var opsId = counterType + "-" + bitwidth;
            if (includeOpKind) {
                opsId += "-" + $op.kind;
            }
            opsBlock.add(opsId);
        }

        // Call function recursively when function calls are found
        for (var $call of Query.searchFrom($stmt, "call")) {
            var $funcDef = $call.definition;

            if ($funcDef === undefined) {
                continue;
            }
            // println("FUNC DEF: " + $funcDef.joinPointType);
            this.count($funcDef, opsBlock, includeOpKind);
        }
    }

    #getCounterType($builtinType: any) {
        if ($builtinType === undefined) {
            return undefined;
        }

        if ($builtinType.isFloat) {
            return "flops";
        } else if ($builtinType.isInteger) {
            return "iops";
        } else {
            PrintOnce.message(
                "StaticOpsCounter: could not determine if builtinType " +
                    $builtinType.kind +
                    " is integer or float"
            );
            return undefined;
        }
    }

    #toBuiltinType($type: any) {
        if ($type.instanceOf("builtinType")) {
            return $type;
        }

        PrintOnce.message(
            "StaticOpsCounter: could not determine builtinType of " +
                $type.joinPointType
        );
        return undefined;
    }

    #isValidOp($op: any) {
        var isValid = StaticOpsCounter.#validOps.has($op.kind);

        if (!isValid) {
            return false;
        }

        if (this.#filterFunction !== undefined) {
            if (!this.#filterFunction($op)) {
                return false;
            }
        }

        return true;
    }

    #analyseIterationsExpr($expr: any, $source: any) {
        var result: { [key: string]: any } = {};

        for (var $varref of Query.searchFromInclusive($expr, "varref")) {
            if (result[$varref.name] !== undefined) {
                continue;
            }
            if ($varref.decl.instanceOf("param")) {
                println("Var " + $varref.name + " is a parameter");
                continue;
            }
            println("REFS of " + $varref.name);
            var $lastWrite = this.#getLastWrite($source, $varref.decl);
            println("Last write of " + $varref.decl + ": " + $lastWrite.code);
            result[$varref.name] = $lastWrite;
        }
        return result;
    }

    #getLastWrite($currentJp: any, $vardecl: any): any | undefined {
        if ($currentJp === undefined) {
            println("Could not find declaration");
            return undefined;
        }
        // println("getVarrefUses: " + $currentJp.code);
        //println("Type: " + $currentJp.joinPointType);
        // Get siblings on the left
        var siblLeft = $currentJp.siblingsLeft;
        // Go back until the variable declaration/parameter is found
        for (var i = siblLeft.length - 1; i >= 0; i--) {
            var sibl = siblLeft[i];
            // For each sibling, find write references to the variable
            var refs = sibl
                .descendantsAndSelf("varref")
                .filter((varref: any) => varref.name === $vardecl.name);
            for (var $ref of refs) {
                // Ignore
                if ($ref.use === "read") {
                    continue;
                }
                // Not supported yet
                if ($ref.use === "readwrite") {
                    println("Readwrite not supported yet");
                    return undefined;
                }
                // Check if assignment
                var $refParent = $ref.parent;
                if (
                    !$refParent.instanceOf("binaryOp") &&
                    $refParent.kind !== "assign"
                ) {
                    println("Not supported when not an assignment");
                    return undefined;
                }
                return $refParent.right;
            }
            // Check vardecl
            var decls = sibl
                .descendantsAndSelf("vardecl")
                .filter((vardecl: any) => vardecl.equals($vardecl));
            for (var $decl of decls) {
                // Found decl
                if (!$decl.hasInit) {
                    println(
                        "Variable declaration for " +
                            $decl.name +
                            " has no initialization"
                    );
                    return undefined;
                }

                return $decl.init;
            }
        }
        // Did not find declaration yet, call on parent
        return this.#getLastWrite($currentJp.parent, $vardecl);
    }
}
