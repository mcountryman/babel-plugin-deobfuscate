"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var t = require("babel-types");
var builtIns = require("./built-ins");
var expressions_1 = require("./expressions");
function evaluateArrayExpression(path) {
    path.assertArrayExpression();
    var elements = path.get('elements').map(expressions_1.evaluateExpression);
    if (elements.some(function (e, i) { return e !== path.node.elements[i]; })) {
        return t.arrayExpression(elements);
    }
    return null;
}
exports.evaluateArrayExpression = evaluateArrayExpression;
function getMutatorCalls(binding) {
    return binding.referencePaths
        .map(function (p) { return p.parentPath; })
        .filter(function (p) { return t.isCallExpression(p.parent) && p.key === 'callee' && builtIns.isArrayMutatorFunctionCall(p.parent); })
        .map(function (p) { return p.parentPath; });
}
exports.getMutatorCalls = getMutatorCalls;
//# sourceMappingURL=arrays.js.map