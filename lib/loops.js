"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var t = require("babel-types");
var u = require("./utils");
var expressions_1 = require("./expressions");
function deobfuscateLoop(path) {
    path.assertLoop();
    if (!t.isForStatement(path.node) || !isLoopBodyEvaluable(path)) {
        return;
    }
    try {
        var statements = evaluateLoop(path, path.node);
        path.replaceWithMultiple(statements);
    }
    catch (e) {
        console.warn(e.message);
        if (!path.node.leadingComments || path.node.leadingComments.length === 0) {
            path.addComment('leading', ' ' + e.message, true);
        }
    }
}
exports.deobfuscateLoop = deobfuscateLoop;
function isLoopBodyEvaluable(path) {
    return getBodyStatements(path).every(function (p) {
        return t.isVariableDeclaration(p.node) ||
            t.isExpressionStatement(p.node) && (t.isAssignmentExpression(p.node.expression) || t.isUpdateExpression(p.node.expression));
    });
}
var error = {
    body: function (path) { return new Error('Unevaluable statement in loop: ' + path.type); },
    init: function () { return new Error('Unevaluable loop init expression'); },
    test: function () { return new Error('Unevaluable loop test expression'); },
    update: function () { return new Error('Unevaluable loop update expression'); }
};
function evaluateLoop(path, loop) {
    t.assertForStatement(loop);
    var control = findControlVariable(path, loop);
    if (!control) {
        throw new Error('Unknown loop control variable');
    }
    var statements = getBodyStatements(path);
    var evaluatedNodes = [];
    evaluateLoopWithControlVariable(path, loop, control, function (controlValue) {
        evaluatedNodes = statements
            .map(function (path) {
            if (t.isExpressionStatement(path.node)) {
                var expression = path.get('expression');
                if (t.isAssignmentExpression(expression.node)) {
                    return evaluateAssignmentExpression(expression, expression.node);
                }
                else if (t.isUpdateExpression(expression.node)) {
                    return evaluateUpdateExpression(expression, expression.node);
                }
                else {
                    throw error.body(path);
                }
            }
            else if (t.isVariableDeclaration(path.node)) {
                return t.noop();
            }
            else {
                throw error.body(path);
            }
        })
            .map(function (result) {
            return t.isExpression(result) ? t.expressionStatement(result) : result;
        });
    });
    return evaluatedNodes;
}
function findControlVariable(path, loop) {
    var name;
    var init;
    if (t.isVariableDeclaration(loop.init) && loop.init.declarations.length === 1) {
        var declaration = loop.init.declarations[0];
        if (t.isIdentifier(declaration.id)) {
            name = declaration.id.name;
            var evaluatedInit = expressions_1.evaluateExpression(path.get('init.declarations.0.init'));
            if (t.isLiteral(evaluatedInit) && u.hasValue(evaluatedInit)) {
                init = evaluatedInit;
            }
        }
    }
    if (name !== undefined && init !== undefined) {
        return { name: name, init: init };
    }
    else {
        return null;
    }
}
function evaluateLoopWithControlVariable(path, loop, controlInfo, evaluateIteration) {
    t.assertForStatement(loop);
    function isControlIdentifier(node) {
        return t.isIdentifier(node, { name: controlInfo.name });
    }
    var test;
    test = function (control) {
        var result = expressions_1.evaluateExpression(path.get('test'));
        if (u.hasValue(result)) {
            return result.value ? true : false;
        }
        else {
            throw error.test();
        }
    };
    var update;
    if (t.isUpdateExpression(loop.update) && isControlIdentifier(loop.update.argument)) {
        switch (loop.update.operator) {
            case '++':
                update = function (control) { return u.someLiteral(control.value + 1); };
                break;
            case '--':
                update = function (control) { return u.someLiteral(control.value - 1); };
                break;
            default: throw error.update();
        }
    }
    else if (t.isAssignmentExpression(loop.update) && isControlIdentifier(loop.update.left)) {
        var assignment_1 = loop.update;
        var rightPath_1 = path.get('update.right');
        update = function (control) {
            var evaluatedRight = expressions_1.evaluateExpression(rightPath_1);
            if (u.hasValue(evaluatedRight)) {
                var value = u.assignmentValue(assignment_1.operator, control.value, evaluatedRight.value);
                return u.someLiteral(value);
            }
            else {
                throw error.update();
            }
        };
    }
    if (update === undefined) {
        return;
    }
    var control = controlInfo.init;
    var binding = path.scope.getBinding(controlInfo.name);
    binding.setValue(control.value);
    try {
        while (test(control)) {
            evaluateIteration(control);
            control = update(control);
            binding.setValue(control.value);
        }
    }
    catch (e) {
        binding.clearValue();
        throw e;
    }
}
function getBodyStatements(path) {
    if (t.isBlockStatement(path.node.body)) {
        return path.get('body.body');
    }
    else if (t.isStatement(path.node.body)) {
        return [path.get('body')];
    }
    else {
        throw error.body(path);
    }
}
function evaluateAssignmentExpression(path, assignment) {
    if (t.isMemberExpression(assignment.left)) {
        return evaluateMemberAssignmentExpression(path, assignment);
    }
    if (!t.isIdentifier(assignment.left)) {
        throw error.body(path);
    }
    var evaluated = expressions_1.evaluateExpression(path.get('right'));
    if (u.hasValue(evaluated)) {
        var binding = path.scope.getBinding(assignment.left.name);
        var value = updateValue(evaluated.value, binding);
        if (binding) {
            binding.setValue(value);
        }
        return t.assignmentExpression('=', assignment.left, u.someLiteral(value));
    }
    else {
        throw error.body(path);
    }
    /**
     * This could be done symbolically if it makes for better de-obfuscation.
     * I.e. generate a binary expression node instead of a literal.
     */
    function updateValue(value, binding) {
        if (!binding && assignment.operator !== '=') {
            throw error.body(path);
        }
        if (!binding.hasValue) {
            if (binding.constantViolations.length === 1 && path.findParent(function (p) { return p === binding.constantViolations[0].parentPath; })) {
                var evaluated_1 = expressions_1.evaluateExpression(binding.path.get('init'));
                if (u.hasValue(evaluated_1)) {
                    binding.setValue(evaluated_1.value);
                }
            }
        }
        return u.assignmentValue(assignment.operator, binding.value, value);
    }
}
function evaluateMemberAssignmentExpression(path, assignment) {
    if (!(t.isMemberExpression(assignment.left, { computed: true }) && t.isIdentifier(assignment.left.object))) {
        throw error.body(path);
    }
    var property = expressions_1.evaluateExpression(path.get('left.property'));
    if (!(u.hasValue(property) && u.isNumeric(property.value))) {
        throw error.body(path);
    }
    if (typeof property.value === 'boolean') {
        throw error.body(path);
    }
    var evaluated = expressions_1.evaluateExpression(path.get('right'));
    if (u.hasValue(evaluated)) {
        var binding = path.scope.getBinding(assignment.left.object.name);
        if (!binding || !binding.hasValue) {
            throw error.body(path);
        }
        binding.value[property.value] = u.assignmentValue(assignment.operator, binding.value[property.value], evaluated.value);
        return t.assignmentExpression('=', assignment.left.object, u.someLiteral(binding.value));
    }
    else {
        throw error.body(path);
    }
}
function evaluateUpdateExpression(path, update) {
    if (!t.isIdentifier(update.argument)) {
        throw error.body(path);
    }
    var evaluated = expressions_1.evaluateExpression(path.get('argument'));
    if (u.hasValue(evaluated)) {
        var value = u.updateValue(update.operator, evaluated.value);
        if (t.isIdentifier(update.argument)) {
            path.scope.getBinding(update.argument.name).setValue(value);
        }
        return t.assignmentExpression('=', update.argument, u.someLiteral(value));
    }
    else {
        throw error.body(path);
    }
}
//# sourceMappingURL=loops.js.map