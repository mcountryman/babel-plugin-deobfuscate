"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var t = require("babel-types");
var u = require("./utils");
var functions_1 = require("./functions");
function evaluate(path) {
    path.assertNewExpression();
    if (!t.isIdentifier(path.node.callee)) {
        return null;
    }
    var constructor = path.node.callee.name;
    switch (constructor) {
        case 'Array': return evaluateArrayConstructor(path);
        default: return null;
    }
}
exports.evaluate = evaluate;
function evaluateArrayConstructor(path) {
    var args = u.withValues(functions_1.evaluatedArguments(path));
    if (!args) {
        return null;
    }
    if (args.length === 1 &&
        typeof args[0].value === 'number' &&
        Number.isInteger(args[0].value)) {
        // If the only argument passed to the Array constructor is an integer, this returns a new array with its length property set to that number (Note: this implies an array of arrayLength empty slots, not slots with actual undefined values).
        return null;
    }
    try {
        return u.someLiteral(new (Array.bind.apply(Array, [void 0].concat(args.map(function (a) { return a.value; }))))());
    }
    catch (e) {
        console.warn('Cannot evaluate array constructor', path.getSource());
        return null;
    }
}
//# sourceMappingURL=new-expressions.js.map