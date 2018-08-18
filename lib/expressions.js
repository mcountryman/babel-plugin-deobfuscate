"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var t = require("babel-types");
var u = require("./utils");
var arrays = require("./arrays");
var binaryExpressions = require("./binary-expressions");
var identifiers = require("./identifiers");
var callExpressions = require("./call-expressions");
var newExpressions = require("./new-expressions");
var memberExpressions = require("./member-expressions");
var unaryExpressions = require("./unary-expressions");
function deobfuscateExpression(path) {
    if (path.isIdentifier() || (path.isLiteral() && !path.isStringLiteral())) {
        // Only replace identifiers that are part of a larger expression.
        return;
    }
    if (path.removed) {
        return;
    }
    var result = evaluateExpression(path);
    if (Array.isArray(result)) {
        path.replaceWithMultiple(result);
    }
    else {
        path.replaceWith(result);
    }
}
exports.deobfuscateExpression = deobfuscateExpression;
function evaluateExpression(path) {
    path.assertExpression();
    var evaluate = evaluator(path);
    return evaluate(path) || path.node;
}
exports.evaluateExpression = evaluateExpression;
function evaluator(path) {
    if (path.isStringLiteral()) {
        return evaluateStringLiteral;
    }
    else if (path.isIdentifier()) {
        return identifiers.evaluate;
    }
    else if (path.isMemberExpression()) {
        return memberExpressions.evaluate;
    }
    else if (path.isCallExpression()) {
        return callExpressions.evaluate;
    }
    else if (path.isNewExpression()) {
        return newExpressions.evaluate;
    }
    else if (path.isBinary()) {
        return binaryExpressions.evaluate;
    }
    else if (path.isConditionalExpression()) {
        return evaluateConditionalExpression;
    }
    else if (path.isUnaryExpression()) {
        return unaryExpressions.evaluate;
    }
    else if (path.isArrayExpression()) {
        return arrays.evaluateArrayExpression;
    }
    else {
        return function () { return null; };
    }
}
var unescaped = Symbol('unescaped');
/** This will only unescape ASCII character escape sequences */
function evaluateStringLiteral(path) {
    if (path.node[unescaped] || !u.hasValue(path.node)) {
        return path.node;
    }
    var node = t.stringLiteral(path.node.value);
    node[unescaped] = true;
    return node;
}
function evaluateConditionalExpression(path) {
    path.assertConditionalExpression();
    var test = evaluateExpression(path.get('test'));
    if (u.hasValue(test)) {
        var result = evaluateExpression(path.get(test.value ? 'consequent' : 'alternate'));
        if (u.hasValue(result)) {
            return result;
        }
    }
    return path.node;
}
//# sourceMappingURL=expressions.js.map