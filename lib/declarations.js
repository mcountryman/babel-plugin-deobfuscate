"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var t = require("babel-types");
var u = require("./utils");
var arrays = require("./arrays");
var deobfuscated = Symbol('deobfuscated');
function transformDeclaration(path) {
    if (path.node[deobfuscated] || t.isLoop(path.parent)) {
        return;
    }
    var declarations = transformVariableDeclaration(path.node, path.scope);
    declarations.forEach(function (it) { it[deobfuscated] = true; });
    var declarationKey = path.key;
    declarations
        .map(function (d) { return d.declarations[0]; })
        .map(function (d) { return [path.scope.getBinding(d.id.name), d.init]; })
        .forEach(function (_a) {
        var binding = _a[0], init = _a[1];
        if (binding) {
            foldConsecutiveArrayPush(binding, init, declarationKey);
            checkArrayMutatorCalls(binding);
        }
    });
    if (declarations.length === 1) {
        path.replaceWith(declarations[0]);
    }
    else {
        // TODO This marks the path as `removed`, but continues traversal which can cause problems down the line...
        path.replaceWithMultiple(declarations);
    }
}
exports.transformDeclaration = transformDeclaration;
// - Split declarators into separate declarations.
// - Mark constants with `const` keyword.
function transformVariableDeclaration(node, scope) {
    t.assertVariableDeclaration(node);
    return node.declarations.map(function (declarator) {
        if (t.isIdentifier(declarator.id)) {
            var binding = scope.getBinding(declarator.id.name);
            if (binding && binding.constant && declarator.init) {
                return t.variableDeclaration('const', [declarator]);
            }
        }
        return t.variableDeclaration('var', [declarator]);
    });
}
function checkArrayMutatorCalls(binding) {
    if (!binding.hasValue || !Array.isArray(binding.value)) {
        return;
    }
    var mutatorCalls = arrays.getMutatorCalls(binding);
    if (mutatorCalls.length === 0) {
        return;
    }
    if (mutatorCalls.some(function (m) { return m.node.callee.property.name !== 'push'; })) {
        binding.deoptValue();
    }
}
// Simplify a very specific case where an array declaration is followed by `push` calls.
function foldConsecutiveArrayPush(binding, init, declarationKey) {
    var mutatorCalls = arrays.getMutatorCalls(binding);
    if (mutatorCalls.length === 0) {
        return;
    }
    for (var _i = 0, mutatorCalls_1 = mutatorCalls; _i < mutatorCalls_1.length; _i++) {
        var call = mutatorCalls_1[_i];
        var statementPath = call.getStatementParent();
        if ((declarationKey + 1) !== statementPath.key || call.node.callee.property.name !== 'push') {
            binding.deoptValue();
            break;
        }
        (_a = init.elements).push.apply(_a, call.node.arguments);
        statementPath.remove();
    }
    if (init.elements.every(function (e) { return u.hasValue(e); })) {
        binding.setValue(init.elements.map(function (e) { return e.value; }));
    }
    else {
        binding.deoptValue();
    }
    var _a;
}
//# sourceMappingURL=declarations.js.map