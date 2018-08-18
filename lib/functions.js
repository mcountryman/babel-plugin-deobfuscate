"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var t = require("babel-types");
var u = require("./utils");
var expressions_1 = require("./expressions");
/** Using param bindings, infer more bindings */
var bindingInferrer = function () { return ({
    VariableDeclarator: function (path) {
        var evaluated = expressions_1.evaluateExpression(path.get('init'));
        var binding = path.scope.getBinding(path.node.id.name);
        if (evaluated && u.hasValue(evaluated)) {
            binding.setValue(evaluated.value);
        }
        else {
            binding.clearValue();
        }
    },
    AssignmentExpression: function (path) {
        var assignment = path.node;
        if (assignment.operator !== '=' || !t.isIdentifier(assignment.left)) {
            return;
        }
        var evaluated = expressions_1.evaluateExpression(path.get('right'));
        var binding = path.scope.getBinding(assignment.left.name);
        if (evaluated && u.hasValue(evaluated)) {
            binding.setValue(evaluated.value);
        }
        else {
            binding.clearValue();
        }
    }
}); };
function evaluate(path, paramBindings) {
    paramBindings = paramBindings || {};
    var body = path.get('body');
    var functionScope = body.scope;
    var result = null;
    setParamBindings(functionScope, paramBindings);
    if (t.isExpression(body.node)) {
        if (u.hasValue(body.node)) {
            result = u.someLiteral(body.node.value);
        }
        else {
            result = expressions_1.evaluateExpression(body);
        }
    }
    else if (t.isBlockStatement(body.node)) {
        if (!isEvaluable(path, body.node)) {
            return null;
        }
        body.traverse(bindingInferrer());
        var resultPath = body.get('body')
            .filter(function (p) { return p.isReturnStatement(); })[0]
            .get('argument');
        var resultNode = expressions_1.evaluateExpression(resultPath);
        if (resultNode) {
            if (u.hasValue(resultNode) || (t.isIdentifier(resultNode) && !functionScope.getOwnBinding(resultNode.name))) {
                result = resultNode;
            }
        }
    }
    clearParamBindings(functionScope, paramBindings);
    return result;
}
exports.evaluate = evaluate;
function evaluatedArguments(path) {
    if (!path.isCallExpression() && !path.isNewExpression()) {
        throw new Error('Expected call or new expression, not ' + path.type);
    }
    return path.get('arguments').map(function (arg) { return expressions_1.evaluateExpression(arg); });
}
exports.evaluatedArguments = evaluatedArguments;
/** Determine if the implementation can evaluate the function */
function isEvaluable(path, body) {
    t.assertBlockStatement(body);
    var returns = body.body.filter(function (s) { return t.isReturnStatement(s); });
    if (returns.length !== 1) {
        return false;
    }
    return body.body.every(function (statement) {
        return t.isReturnStatement(statement) ||
            t.isVariableDeclaration(statement) ||
            u.isAssignmentExpressionStatement(statement);
    });
}
function setParamBindings(scope, paramBindings) {
    Object.keys(paramBindings).forEach(function (name) {
        var binding = scope.getBinding(name);
        if (binding) {
            binding.setValue(paramBindings[name]);
        }
    });
}
function clearParamBindings(scope, paramBindings) {
    Object.keys(paramBindings).forEach(function (name) {
        var binding = scope.getBinding(name);
        if (binding) {
            binding.clearValue();
        }
    });
}
//# sourceMappingURL=functions.js.map