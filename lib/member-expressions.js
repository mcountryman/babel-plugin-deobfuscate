"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var t = require("babel-types");
var u = require("./utils");
var arrays = require("./arrays");
var expressions_1 = require("./expressions");
function evaluate(path) {
    path.assertMemberExpression();
    if (t.isAssignmentExpression(path.parent) && path.key === 'left') {
        return null;
    }
    var memberExpression = path.node;
    var propertyValue;
    if (memberExpression.computed && t.isExpression(memberExpression.property)) {
        var evaluated = expressions_1.evaluateExpression(path.get('property'));
        if (u.hasValue(evaluated)) {
            propertyValue = evaluated.value;
            var transformedExpression = transformComputedMemberExpression(memberExpression, propertyValue, path.scope);
            if (!t.isMemberExpression(transformedExpression)) {
                return transformedExpression;
            }
            memberExpression = transformedExpression;
        }
        else {
            return memberExpression;
        }
    }
    else if (t.isIdentifier(memberExpression.property)) {
        propertyValue = memberExpression.property.name;
    }
    else {
        return memberExpression;
    }
    if (t.isIdentifier(memberExpression.object)) {
        var binding = path.scope.getBinding(memberExpression.object.name);
        if (!binding) {
            return memberExpression;
        }
        var object = expressions_1.evaluateExpression(path.get('object'));
        if (!object || !u.hasValue(object)) {
            return memberExpression;
        }
        if (arrays.getMutatorCalls(binding).length > 0) {
            // TODO potential for improvement here
            return memberExpression;
        }
        var assignments = u.getMemberAssignments(binding, { propertyValue: propertyValue });
        if (assignments.some(function (p) { return p.scope !== path.scope; })) {
            // Out of scope mutation
            return memberExpression;
        }
        var previousAssignments = assignments.filter(function (p) { return p.getStatementParent().key < path.getStatementParent().key; });
        if (previousAssignments.length > 0) {
            // Find value of most recent previous assignment
            var lastAssignment = previousAssignments[previousAssignments.length - 1];
            var result = expressions_1.evaluateExpression(lastAssignment.get('right'));
            if (result && u.hasValue(result)) {
                return u.someLiteral(result.value);
            }
        }
        else {
            return getMemberExpressionValue(path, object, propertyValue) || memberExpression;
        }
    }
    else if (u.hasValue(memberExpression.object)) {
        return getMemberExpressionValue(path, memberExpression.object, propertyValue) || memberExpression;
    }
    return memberExpression;
}
exports.evaluate = evaluate;
function getMemberExpressionValue(path, object, propertyValue) {
    var value = object.value[propertyValue];
    return u.someLiteral(value);
}
function transformComputedMemberExpression(memberExpression, propertyValue, scope) {
    if (u.isNumeric(propertyValue) && typeof propertyValue !== 'number') {
        var property = t.numericLiteral(parseFloat(propertyValue));
        return t.memberExpression(memberExpression.object, property, true);
    }
    else if (typeof propertyValue === 'string') {
        if (t.isThisExpression(memberExpression.object) && isGlobalScope(scope)) {
            return t.identifier(propertyValue);
        }
        return t.memberExpression(memberExpression.object, t.identifier(propertyValue), false);
    }
    else {
        return memberExpression;
    }
}
function isGlobalScope(scope) {
    return !scope.parent;
}
//# sourceMappingURL=member-expressions.js.map