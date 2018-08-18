"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var t = require("babel-types");
var babylon = require("babylon");
var u = require("./utils");
var builtIns = require("./built-ins");
var functions = require("./functions");
var expressions_1 = require("./expressions");
/** Evaluate or inline a call expression. */
function evaluate(path) {
    path.assertCallExpression();
    var result = null;
    var callee = path.node.callee;
    if (t.isMemberExpression(callee) && t.isIdentifier(callee.object, { name: 'window' })) {
        var property = expressions_1.evaluateExpression(path.get('callee.property'));
        if (t.isStringLiteral(property)) {
            callee = t.identifier(property.value);
            result = t.callExpression(callee, path.node.arguments);
        }
    }
    if (t.isMemberExpression(callee)) {
        if (t.isThisExpression(callee.object)) {
            var property = expressions_1.evaluateExpression(path.get('callee.property'));
            result = evaluateThisMemberCall(path, property);
        }
        else {
            var object = expressions_1.evaluateExpression(path.get('callee.object'));
            result = evaluateMemberCall(path, object);
        }
    }
    else if (t.isFunction(callee)) {
        var paramBindings = evaluateParamBindings(path, callee);
        result = functions.evaluate(path.get('callee'), paramBindings);
    }
    else if (t.isIdentifier(callee)) {
        result = evaluateFunctionCall(path, callee);
    }
    return result;
}
exports.evaluate = evaluate;
/** Inline if the function is a procedure, called inside a statement, only for its side-effects. */
function inlineProcedure(path, traverse) {
    path.assertCallExpression();
    if (!t.isIdentifier(path.node.callee) || !path.parentPath.isExpressionStatement()) {
        return;
    }
    var functionDeclaration = getFunctionDeclaration(path, path.node.callee.name);
    if (!functionDeclaration) {
        return;
    }
    var bodyStatements = functionDeclaration.node.body.body;
    var returnStatements = bodyStatements.filter(function (s) { return t.isReturnStatement(s); });
    if (returnStatements.length !== 0) {
        return;
    }
    var params = functionDeclaration.node.params;
    if (hasShadowing(path.scope, params)) {
        return;
    }
    if (params.length > 0) {
        // Replace procedure parameters
        var args_1 = params.map(function (p, i) { return path.node.arguments[i] || t.identifier('undefined'); });
        var procedure = babylon.parse(functionDeclaration.get('body').getSource());
        traverse(procedure, {
            Identifier: function (path) {
                params.forEach(function (p, i) {
                    if (path.node.name === p.name) {
                        path.replaceWith(args_1[i]);
                    }
                });
            }
        });
        replaceWithStatements(procedure.program.body[0].body);
    }
    else {
        replaceWithStatements(bodyStatements);
    }
    function replaceWithStatements(statements) {
        var functionBinding = path.scope.getBinding(path.node.callee.name);
        functionBinding.referencePaths = functionBinding.referencePaths.filter(function (p) { return p !== path.get('callee'); });
        functionBinding.dereference();
        traverse(statements, {
            Identifier: function (path) {
                var binding = path.scope.getBinding(path.node.name);
                if (binding) {
                    binding.reference(path);
                }
            }
        }, path.scope);
        path.replaceWithMultiple(statements);
    }
}
exports.inlineProcedure = inlineProcedure;
/** Returns `true` if inlining `indentifiers` into `targetScope` would cause indentifiers to clash. */
function hasShadowing(targetScope, indentifiers) {
    return indentifiers.map(function (p) { return p.name; }).some(function (name) { return targetScope.getBinding(name); });
}
function evaluateFunctionCall(path, callee) {
    t.assertIdentifier(callee);
    var args = functions.evaluatedArguments(path);
    if (callee.name === 'eval' && args.length === 1 && u.hasValue(args[0])) {
        return evaluateEvalCall(path, args[0]['value']);
    }
    var functionDeclaration = getFunctionDeclaration(path, callee.name);
    if (functionDeclaration) {
        var paramBindings = evaluateParamBindings(path, functionDeclaration.node);
        return functions.evaluate(functionDeclaration, paramBindings);
    }
    return evaluateGlobalFunction(callee, args);
}
function evaluateGlobalFunction(callee, args) {
    if (builtIns.isEvaluableGlobalFunctionCall(callee.name)) {
        var argumentValues = u.withValues(args);
        if (argumentValues) {
            return u.someLiteral(global[callee.name].apply(global, argumentValues.map(function (a) { return a.value; })));
        }
    }
    return null;
}
function evaluateMemberCall(path, object) {
    var call = path.node;
    var args = functions.evaluatedArguments(path);
    if (isEvaluableReplaceWithFunctionArgument(call, object, args[0])) {
        return evaluateReplaceWithFunctionArgumentResult(path, object, args[0]);
    }
    var argumentsWithValues = u.withValues(args);
    if (!argumentsWithValues) {
        return null;
    }
    // Allow mutators if the object is an expression that will be discarded. I.e. chained calls or literal objects.
    var allowMutators = t.isCallExpression(path.node.callee.object) || u.hasValue(path.node.callee.object);
    if (builtIns.isEvaluableInstanceFunctionCall(call, object, allowMutators)) {
        return evaluateInstanceFunctionCall(call, object, argumentsWithValues);
    }
    else if (builtIns.isEvaluableStaticFunctionCall(call, object)) {
        return evaluateStaticFunctionCall(call, object, argumentsWithValues);
    }
    return null;
}
function evaluateThisMemberCall(path, property) {
    if (!u.hasValue(property)) {
        return null;
    }
    var functionDeclaration = getFunctionDeclaration(path, property.value.toString());
    if (!functionDeclaration) {
        return null;
    }
    var paramBindings = evaluateParamBindings(path, functionDeclaration.node);
    return functions.evaluate(functionDeclaration, paramBindings);
}
function getFunctionDeclaration(path, name) {
    var binding = path.scope.getBinding(name);
    if (binding && t.isFunctionDeclaration(binding.path.node)) {
        return binding.path;
    }
    return null;
}
function isEvaluableReplaceWithFunctionArgument(call, object, patternArgument) {
    return u.hasValue(object) &&
        t.isMemberExpression(call.callee) &&
        call.callee.property['name'] === 'replace' &&
        call.arguments.length === 2 &&
        u.hasValue(patternArgument) &&
        t.isFunction(call.arguments[1]);
}
/** Fairly aggressive evaluation that can be incorrect if member functions are overriden in the input code. */
function evaluateInstanceFunctionCall(call, object, _arguments) {
    t.assertCallExpression(call);
    t.assertMemberExpression(call.callee);
    try {
        var objectValue = object.value;
        var functionName = call.callee.property['name'];
        var argumentValues = _arguments.map(function (arg) { return arg.value; });
        var result = objectValue[functionName].apply(objectValue, argumentValues);
        return u.someLiteral(result);
    }
    catch (e) {
        console.warn(e);
        return call;
    }
}
function evaluateStaticFunctionCall(call, object, _arguments) {
    t.assertCallExpression(call);
    t.assertMemberExpression(call.callee);
    try {
        var staticObject = global[object.name];
        var functionName = call.callee.property.name;
        var argumentValues = _arguments.map(function (arg) { return arg.value; });
        var result = staticObject[functionName].apply(staticObject, argumentValues);
        return u.someLiteral(result);
    }
    catch (e) {
        console.warn(e);
        return call;
    }
}
/**
 * Allows for function as second argument.
 * This can't resolve nested functions. Nodes can't be replaced since the parameter bindings
 * are different as the function is called multiple times. Therefore we can't recursively traverse the function argument.
 */
function evaluateReplaceWithFunctionArgumentResult(path, object, patternArgument) {
    path.assertCallExpression();
    var bail = false;
    var result = object.value.replace(patternArgument.value, function () {
        var replaceArguments = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            replaceArguments[_i] = arguments[_i];
        }
        if (bail) {
            return '';
        }
        var replacementFunctionArgument = path.get('arguments.1');
        var paramBindings = replacementFunctionArgument.node.params
            .map(function (param, i) {
            return (_a = {}, _a[param.name] = replaceArguments[i], _a);
            var _a;
        })
            .reduce(Object.assign, {});
        var result = functions.evaluate(replacementFunctionArgument, paramBindings);
        if (result && u.hasValue(result)) {
            return result.value;
        }
        else {
            bail = true;
            console.warn('Can\'t evaluate string replace: ', path.getSource());
            return '';
        }
    });
    if (bail) {
        return path.node;
    }
    return u.someLiteral(result) || path.node;
}
function evaluateEvalCall(path, argument) {
    try {
        var ast = babylon.parse(argument);
        return ast.program.body;
    }
    catch (e) {
        console.warn('Could not parse eval argument: ' + argument);
        return null;
    }
}
function evaluateParamBindings(callPath, functionExpression) {
    callPath.assertCallExpression();
    var args = u.withValues(functions.evaluatedArguments(callPath));
    if (!args) {
        return {};
    }
    return functionExpression.params
        .map(function (p, i) {
        var value = args[i] ? args[i].value : undefined;
        return _a = {}, _a[p['name']] = value, _a;
        var _a;
    })
        .reduce(Object.assign, {});
}
//# sourceMappingURL=call-expressions.js.map