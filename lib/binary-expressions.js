"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var t = require("babel-types");
var u = require("./utils");
var expressions_1 = require("./expressions");
function evaluate(path) {
    path.assertBinary();
    var _a = path.node, operator = _a.operator, left = _a.left, right = _a.right;
    if (!u.hasValue(left)) {
        left = expressions_1.evaluateExpression(path.get('left'));
    }
    if (!u.hasValue(right)) {
        right = expressions_1.evaluateExpression(path.get('right'));
    }
    if (t.isBinaryExpression(left) && u.hasValue(left.right) && u.hasValue(right)) {
        if (left.operator === operator && isAssociative(operator)) {
            var result = evaluateBinaryNodes(operator, left.right, right);
            if (result) {
                right = result;
                left = left.left;
                return t.binaryExpression(operator, left, right);
            }
        }
    }
    if (u.hasValue(left) && u.hasValue(right)) {
        return evaluateBinaryNodes(operator, left, right) || path.node;
    }
    return path.node;
}
exports.evaluate = evaluate;
function isAssociative(operator) {
    return operator === '+';
}
function evaluateBinaryNodes(operator, leftNode, rightNode) {
    var _a = [leftNode, rightNode], left = _a[0].value, right = _a[1].value;
    switch (operator) {
        // Arithmetic
        case '+': return u.someLiteral(left + right);
        case '-': return u.someLiteral(left - right);
        case '*': return u.someLiteral(left * right);
        case '/': return u.someLiteral(left / right);
        case '%': return u.someLiteral(left % right);
        // Bitwise Shift
        case '<<': return u.someLiteral(left << right);
        case '>>': return u.someLiteral(left >> right);
        case '>>>': return u.someLiteral(left >>> right);
        // Relational
        case '<': return u.someLiteral(left < right);
        case '>': return u.someLiteral(left > right);
        case '<=': return u.someLiteral(left <= right);
        case '>=': return u.someLiteral(left >= right);
        // !!! case 'instanceof': return u.someLiteral(left instanceof right);
        // !!! case 'in': return u.someLiteral(left in right);
        // Equality
        case '==': return u.someLiteral(left == right); /* tslint:enable */
        case '!=': return u.someLiteral(left != right); /* tslint:enable */
        case '===': return u.someLiteral(left === right);
        case '!==': return u.someLiteral(left !== right);
        // Logic
        case '&&': return u.someLiteral(left && right);
        case '||': return u.someLiteral(left || right);
        // Binary Bitwise
        case '&': return u.someLiteral(left & right);
        case '^': return u.someLiteral(left ^ right);
        case '|': return u.someLiteral(left | right);
        default: return null;
    }
}
//# sourceMappingURL=binary-expressions.js.map