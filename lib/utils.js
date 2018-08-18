"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var t = require("babel-types");
function hasValue(node) {
    if (!t.isExpression(node)) {
        return false;
    }
    if (t.isLiteral(node)) {
        if (t.isRegExpLiteral(node)) {
            node['value'] = new RegExp(node.pattern, node.flags);
        }
        if (t.isNullLiteral(node)) {
            node['value'] = null;
        }
        return true;
    }
    if (t.isArrayExpression(node)) {
        if (node.elements.every(function (e) { return t.isExpression(e) && hasValue(e); })) {
            node['value'] = node.elements.map(function (e) { return e['value']; });
            return true;
        }
    }
    if (t.isIdentifier(node)) {
        if (node.name === 'undefined') {
            node['value'] = undefined;
            return true;
        }
        else if (node.name === 'NaN') {
            node['value'] = NaN;
            return true;
        }
    }
    return false;
}
exports.hasValue = hasValue;
function withValues(expressions) {
    return expressions.every(function (arg) { return hasValue(arg); }) ? expressions : null;
}
exports.withValues = withValues;
function isNumeric(object) {
    return !isNaN(object - parseFloat(object));
}
exports.isNumeric = isNumeric;
// TODO Template literals?
function someLiteral(value) {
    var node = (function () {
        switch (typeof value) {
            case 'undefined': return t.identifier('undefined');
            case 'boolean': return t.booleanLiteral(value);
            case 'string': return t.stringLiteral(value);
            case 'number': return t.numericLiteral(value);
            case 'object':
                if (Array.isArray(value)) {
                    var values = value.map(someLiteral);
                    return t.arrayExpression(values);
                }
                else if (value instanceof RegExp) {
                    return t.regExpLiteral(value.source, value['flags']);
                }
                return t.nullLiteral();
            default: return null;
        }
    })();
    if (node) {
        node['value'] = value;
        return node;
    }
    return null;
}
exports.someLiteral = someLiteral;
function isAssignmentExpressionStatement(statement) {
    t.assertStatement(statement);
    return t.isExpressionStatement(statement) &&
        t.isAssignmentExpression(statement.expression, { operator: '=' }) &&
        t.isIdentifier(statement.expression.left);
}
exports.isAssignmentExpressionStatement = isAssignmentExpressionStatement;
/**
 * This could be done symbolically if it makes for better de-obfuscation.
 * I.e. generate a binary expression node instead of a literal.
 */
function assignmentValue(operator, oldValue, value) {
    switch (operator) {
        case '=': return value;
        case '+=': return oldValue + value;
        case '-=': return oldValue - value;
        case '*=': return oldValue * value;
        case '/=': return oldValue / value;
        default: throw new Error('Unexpected operator in assignment: ' + operator);
    }
}
exports.assignmentValue = assignmentValue;
/**
 * This could be done symbolically if it makes for better de-obfuscation.
 * I.e. generate a binary expression node instead of a literal.
 */
function updateValue(operator, value) {
    switch (operator) {
        case '++': return value + 1;
        case '--': return value - 1;
        default: throw new Error('Unexpected operator in update expression: ' + operator);
    }
}
exports.updateValue = updateValue;
/** Find paths where a property gets assigned. */
function getMemberAssignments(binding, option) {
    return binding.referencePaths
        .map(function (p) { return p.parentPath; })
        .filter(function (p) { return t.isAssignmentExpression(p.parent) && p.key === 'left'; })
        .filter(function (p) { return option ? p.node.property.value === option.propertyValue : true; })
        .map(function (p) { return p.parentPath; });
}
exports.getMemberAssignments = getMemberAssignments;
//# sourceMappingURL=utils.js.map