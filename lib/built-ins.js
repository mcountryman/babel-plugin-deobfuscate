"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var t = require("babel-types");
var u = require("./utils");
var globalFunctions = new Set([
    'isFinite',
    'isNaN',
    'parseFloat',
    'parseInt',
    'decodeURI',
    'decodeURIComponent',
    'encodeURI',
    'encodeURIComponent',
    'escape',
    'unescape'
]);
function isEvaluableGlobalFunctionCall(functionName) {
    return globalFunctions.has(functionName);
}
exports.isEvaluableGlobalFunctionCall = isEvaluableGlobalFunctionCall;
var evaluableStaticFunctions = {
    String: new Set(['fromCharCode'])
};
function isEvaluableStaticFunctionCall(call, object) {
    if (!t.isCallExpression(call) ||
        !t.isMemberExpression(call.callee) ||
        !t.isIdentifier(call.callee.property) ||
        !t.isIdentifier(object)) {
        t.assertCallExpression(call);
        return false;
    }
    var functions = evaluableStaticFunctions[object.name];
    return functions && functions.has(call.callee.property.name);
}
exports.isEvaluableStaticFunctionCall = isEvaluableStaticFunctionCall;
var arrayMutatorMethods = new Set(['fill', 'pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift']);
function isArrayMutatorFunctionCall(call) {
    if (!t.isCallExpression(call) ||
        !t.isMemberExpression(call.callee) ||
        !t.isIdentifier(call.callee.property)) {
        t.assertCallExpression(call);
        return false;
    }
    return arrayMutatorMethods.has(call.callee.property.name);
}
exports.isArrayMutatorFunctionCall = isArrayMutatorFunctionCall;
var evaluableInstanceFunctions = {
    number: new Set(['toString']),
    string: new Set(['replace', 'charAt', 'charCodeAt', 'indexOf', 'toLowerCase', 'toUpperCase', 'split', 'substring']),
    array: new Set(['toString', 'indexOf', 'join'])
};
/** Check if callee and argument values required for evaluation are available */
function isEvaluableInstanceFunctionCall(call, object, allowMutators) {
    if (!t.isCallExpression(call) ||
        !t.isMemberExpression(call.callee) ||
        !t.isIdentifier(call.callee.property) ||
        !u.hasValue(object)) {
        return false;
    }
    var evaluables = new Set();
    if (typeof object.value === 'number') {
        evaluables = evaluableInstanceFunctions.number;
    }
    else if (typeof object.value === 'string') {
        evaluables = evaluableInstanceFunctions.string;
    }
    else if (Array.isArray(object.value)) {
        evaluables = allowMutators ? union(evaluableInstanceFunctions.array, arrayMutatorMethods) : evaluableInstanceFunctions.array;
    }
    return evaluables.has(call.callee.property.name);
}
exports.isEvaluableInstanceFunctionCall = isEvaluableInstanceFunctionCall;
function union(lhs, rhs) {
    var union = new Set(lhs);
    rhs.forEach(function (e) { return union.add(e); });
    return union;
}
//# sourceMappingURL=built-ins.js.map