"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var u = require("./utils");
var expressions_1 = require("./expressions");
function evaluate(path) {
    path.assertUnaryExpression();
    var argument = path.node.argument;
    if (!u.hasValue(argument)) {
        argument = expressions_1.evaluateExpression(path.get('argument'));
    }
    if (u.hasValue(argument)) {
        return evaluateUnaryNode(path.node.operator, argument);
    }
    return null;
}
exports.evaluate = evaluate;
function evaluateUnaryNode(operator, argument) {
    switch (operator) {
        case '!': return u.someLiteral(!argument.value);
        case '~': return u.someLiteral(~argument.value);
        case '-': return u.someLiteral(-argument.value);
        case '+': return u.someLiteral(+argument.value);
        default: return null;
    }
}
//# sourceMappingURL=unary-expressions.js.map