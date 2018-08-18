"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var u = require("./utils");
var expressions_1 = require("./expressions");
var declarations_1 = require("./declarations");
var call_expressions_1 = require("./call-expressions");
var loops_1 = require("./loops");
function Deobfuscator(babel) {
    return {
        VariableDeclaration: declarations_1.transformDeclaration,
        CallExpression: function (path) {
            call_expressions_1.inlineProcedure(path, babel.traverse);
        },
        Expression: {
            enter: expressions_1.deobfuscateExpression,
            exit: function (path) {
                expressions_1.deobfuscateExpression(path);
                if (path.parentPath.isVariableDeclarator() && u.hasValue(path.node)) {
                    var binding = path.scope.getBinding(path.parent.id.name);
                    if (binding && binding.constant) {
                        binding.setValue(path.node.value);
                    }
                }
                if (u.hasValue(path.node)) {
                    path.skip();
                }
            }
        },
        Loop: {
            enter: loops_1.deobfuscateLoop,
            exit: loops_1.deobfuscateLoop
        }
        // DCE
        // , Scope: {
        //   exit (path) {
        //     Object.keys(path.scope.bindings)
        //       .map(key => path.scope.getBinding(key))
        //       .forEach(binding => {
        //         const declaration = binding.path.parentPath
        //         if (binding.constant && binding.hasValue && !binding.referenced && !declaration.removed) {
        //           declaration.remove()
        //         }
        //       })
        //   }
        // }
    };
}
function default_1(babel) {
    return {
        name: 'deobfuscate',
        visitor: Deobfuscator(babel)
    };
}
exports.default = default_1;
//# sourceMappingURL=index.js.map