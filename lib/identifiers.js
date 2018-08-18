"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var t = require("babel-types");
var u = require("./utils");
var expressions_1 = require("./expressions");
function evaluate(path) {
    t.assertIdentifier(path.node);
    var binding = path.scope.getBinding(path.node.name);
    if (!binding) {
        return null;
    }
    var memberAssignments = u.getMemberAssignments(binding)
        .filter(function (a) { return a.scope === path.scope; })
        .filter(function (a) { return a.getStatementParent().key < path.getStatementParent().key; });
    if (binding.hasValue && memberAssignments.length === 0) {
        return u.someLiteral(binding.value);
    }
    if (binding.constant && binding.path.parentKey === 'declarations' && !isSelfReferencingInDeclaration(path, binding)) {
        var init = evaluateInit(path, binding);
        // Handle member assigments
        if (init && u.hasValue(init)) {
            init = t['cloneDeep'](init); // TODO declare typescript types
            for (var _i = 0, memberAssignments_1 = memberAssignments; _i < memberAssignments_1.length; _i++) {
                var assignment = memberAssignments_1[_i];
                var property = expressions_1.evaluateExpression(assignment.get('left.property'));
                if (!(u.hasValue(property) && typeof property.value !== 'boolean')) {
                    return null;
                }
                var right = expressions_1.evaluateExpression(assignment.get('right'));
                if (!u.hasValue(right)) {
                    return null;
                }
                if (t.isArrayExpression(init) && u.hasValue(init)) {
                    init.elements[property.value] = right;
                    init.value[property.value] = right.value;
                }
                else {
                    return null;
                }
            }
        }
        return init;
    }
    // Single assignment after declaration
    if (binding.constantViolations.length === 1 &&
        t.isVariableDeclarator(binding.path.node) &&
        path.findParent(function (p) { return p === binding.constantViolations[0].parentPath; }) &&
        !isSelfReferencingInDeclaration(path, binding)) {
        var init = binding.path.get('init');
        if (!init.findParent(function (p) { return t.isLoop(p); })) {
            return evaluateInit(path, binding);
        }
    }
    // Try resolving variable within local scope
    if (binding === path.scope.getOwnBinding(path.node.name)) {
        if (hasAssignmentsInChildScope(binding, path.scope)) {
            return null;
        }
        var statementKey_1 = path.getStatementParent().key;
        var latestAssignment = binding.constantViolations.filter(function (a) { return a.getStatementParent().key < statementKey_1; }).pop();
        if (latestAssignment && latestAssignment.node.operator === '=') {
            return expressions_1.evaluateExpression(latestAssignment.get('right'));
        }
        else {
            return null; // TODO evaluateInit(path, binding, evaluateExpression)
        }
    }
    return null;
}
exports.evaluate = evaluate;
function evaluateInit(path, binding) {
    if (!t.isVariableDeclarator(binding.path.node) || isSelfReferencingInDeclaration(path, binding)) {
        return null;
    }
    var init = binding.path.get('init');
    return expressions_1.evaluateExpression(init);
}
/** This occurs bindings are shadowed and is required to break infinite recursion. */
function isSelfReferencingInDeclaration(path, binding) {
    return getDeclaration(path) === getDeclaration(binding.path);
}
function getDeclaration(path) {
    var parent = path.findParent(function (path) { return t.isVariableDeclaration(path.node); });
    return parent ? parent.node : null;
}
function hasAssignmentsInChildScope(binding, scope) {
    binding.constantViolations.some(function (p) {
        if (!t.isAssignmentExpression(p.node)) {
            return true;
        }
        if (p.scope !== scope) {
            if (p.scope.path.isFunctionDeclaration()) {
                return p.scope.getBinding(p.scope.path.node.id.name).referenced;
            }
            return true;
        }
    });
}
//# sourceMappingURL=identifiers.js.map