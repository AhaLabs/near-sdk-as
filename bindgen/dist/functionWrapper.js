"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FunctionExportWrapper = exports.FunctionClass = void 0;
const as_1 = require("visitor-as/as");
const visitor_as_1 = require("visitor-as");
const common_1 = require("./common");
const utils_1 = require("./utils");
const transformRange_1 = require("visitor-as/dist/transformRange");
class FunctionClass extends visitor_as_1.BaseVisitor {
    _class;
    visitFunctionDeclaration(node) {
        let name = utils_1.getName(node);
        let fields = node.signature.parameters.map((p) => `${utils_1.toString(p.name)}: ${utils_1.getName(p.type)}${p.initializer ? " = " + utils_1.toString(p.initializer) : ""}`);
        let params = node.signature.parameters.map((p) => `this.${utils_1.getName(p)}`);
        if (fields.length > 0) {
            // add blank to make join add ;
            fields.push("");
        }
        const fieldStrs = fields.join(";\n");
        let _classStr = `class ${name}__class {
  ${fieldStrs}
  call(): ${utils_1.getName(node.signature.returnType)} {
    ${common_1.returnsVoid(node) ? "" : "return "}${name}(${params.join(",")});
  }
}`;
        let _class = (visitor_as_1.SimpleParser.parseTopLevelStatement(_classStr));
        // MethodInjector.visit(_class);
        this._class = _class;
    }
    static visit(node) {
        const funcClass = new FunctionClass();
        funcClass.visit(node);
        return funcClass._class;
    }
}
exports.FunctionClass = FunctionClass;
function emptySignature(node) {
    return common_1.numOfParameters(node) == 0 && common_1.returnsVoid(node);
}
class FunctionExportWrapper extends visitor_as_1.BaseVisitor {
    static isTest = false;
    functions = [];
    exports = [];
    wrappedFuncs = new Set();
    classWrappers = [];
    static checkTestBuild(sources) {
        this.isTest = sources.some((s) => s.normalizedPath.includes(".spec."));
    }
    needsWrapper(node) {
        let isExport = node.is(as_1.CommonFlags.EXPORT);
        let alreadyWrapped = this.wrappedFuncs.has(utils_1.toString(node.name));
        let noInputOrOutput = emptySignature(node);
        if (!isExport ||
            alreadyWrapped ||
            noInputOrOutput ||
            FunctionExportWrapper.isTest)
            return false;
        return common_1.isEntry(node) || visitor_as_1.utils.hasDecorator(node, common_1.NEAR_DECORATOR);
    }
    visitFunctionDeclaration(node) {
        const name = utils_1.toString(node.name);
        if (!this.needsWrapper(node)) {
            if ((common_1.isEntry(node) || visitor_as_1.utils.hasDecorator(node, common_1.NEAR_DECORATOR)) &&
                !this.wrappedFuncs.has(name) &&
                node.is(as_1.CommonFlags.EXPORT)) {
                const snakeCase = this.camelCaseToSnakeCaseExport(name, "");
                this.wrappedFuncs.add(name);
                if (snakeCase) {
                    this.exports.push(snakeCase);
                }
            }
            super.visitFunctionDeclaration(node);
            return;
        }
        if (common_1.numOfParameters(node) > 0) {
            const _class = FunctionClass.visit(node);
            transformRange_1.RangeTransform.visit(_class, node);
            this.classWrappers.push(_class);
        }
        this.functions.push(common_1.parseTopLevelStatements(this.generateWrapperFunction(node))[0]);
        // Change function to not be an export
        node.flags = node.flags ^ as_1.CommonFlags.EXPORT;
        this.wrappedFuncs.add(name);
    }
    camelCaseToSnakeCaseExport(name, prefix = common_1.WRAPPER_PREFIX) {
        let s = utils_1.makeSnakeCase(name);
        if (s.normalize() === name.normalize()) {
            return "";
        }
        return `export { ${prefix + name} as ${s} }`;
    }
    /*
    Create a wrapper function that will be export in the function's place.
    */
    generateWrapperFunction(func) {
        let funcSource = [];
        let signature = func.signature;
        let params = signature.parameters;
        let returnType = signature.returnType;
        let returnTypeName = utils_1.toString(returnType);
        let name = utils_1.getName(func);
        if (func.decorators && func.decorators.length > 0) {
            funcSource.push(func.decorators.map((decorator) => utils_1.toString(decorator)).join("\n"));
        }
        const className = name + "__class";
        funcSource.push(`
    function __wrapper_${name}(): void {`);
        if (params.length > 0) {
            funcSource.push(`  const _class = JSON.parse<${className}>(getInputString())`);
        }
        if (returnTypeName !== "void") {
            if (params.length > 0) {
                funcSource.push(`let result: ${returnTypeName} = _class.call();`);
            }
            else {
                funcSource.push(`let result: ${returnTypeName} = ${name}();`);
            }
            funcSource.push(`
      const val = String.UTF8.encode(JSON.stringify(result));
      value_return(val.byteLength, changetype<usize>(val));
  `);
        }
        else {
            if (params.length > 0) {
                funcSource.push(`_class.call()`);
            }
            else {
                funcSource.push(`${name}();`);
            }
        }
        funcSource.push(`}`);
        this.addExport(name);
        return funcSource.join("\n");
    }
    addExport(name) {
        this.exports.push(`export {${common_1.WRAPPER_PREFIX + name} as ${name}}`);
        let res = this.camelCaseToSnakeCaseExport(name, common_1.WRAPPER_PREFIX);
        if (res) {
            this.exports.push(res);
        }
    }
    visitSource(node) {
        super.visitSource(node);
        const newParser = new as_1.Parser();
        const lastStatement = (node.statements.length && node.statements[node.statements.length - 1]) ||
            node;
        if (this.functions.length > 0) {
            node.statements.push(...this.functions.map((n) => transformRange_1.RangeTransform.visit(n, lastStatement)));
            const str = this.exports.join("\n");
            newParser.parseFile(str, node.normalizedPath, common_1.isEntry(node));
            const exportsSource = newParser.sources[0];
            node.statements = node.statements.concat(exportsSource.statements);
            node.statements.push(...this.classWrappers);
        }
    }
    static visit(sources) {
        FunctionExportWrapper.checkTestBuild(sources);
        sources.forEach((s) => {
            new FunctionExportWrapper().visit(s);
        });
    }
}
exports.FunctionExportWrapper = FunctionExportWrapper;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnVuY3Rpb25XcmFwcGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2Z1bmN0aW9uV3JhcHBlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxzQ0FTdUI7QUFDdkIsMkNBQThEO0FBQzlELHFDQVFrQjtBQUNsQixtQ0FBMkQ7QUFDM0QsbUVBQWdFO0FBRWhFLE1BQWEsYUFBYyxTQUFRLHdCQUFXO0lBQzVDLE1BQU0sQ0FBb0I7SUFFMUIsd0JBQXdCLENBQUMsSUFBeUI7UUFDaEQsSUFBSSxJQUFJLEdBQUcsZUFBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3pCLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FDeEMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUNKLEdBQUcsZ0JBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssZUFBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FDckMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLGdCQUFRLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUNwRCxFQUFFLENBQ0wsQ0FBQztRQUNGLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsUUFBUSxlQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3hFLElBQUksTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDckIsK0JBQStCO1lBQy9CLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDakI7UUFFRCxNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3JDLElBQUksU0FBUyxHQUFHLFNBQVMsSUFBSTtJQUM3QixTQUFTO1lBQ0Qs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QUMsK0JBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQ3JFLENBQUM7WUFFRixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNwQyxTQUFTLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsY0FBYyxFQUFFLGdCQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUM3RCxNQUFNLGFBQWEsR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzNDLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ25FLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1NBQzdDO0lBQ0gsQ0FBQztJQUVELE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBaUI7UUFDNUIscUJBQXFCLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzlDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUNwQixJQUFJLHFCQUFxQixFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3ZDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQzs7QUEvSUgsc0RBZ0pDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcbiAgQ2xhc3NEZWNsYXJhdGlvbixcbiAgU291cmNlLFxuICBDb21tb25GbGFncyxcbiAgRnVuY3Rpb25EZWNsYXJhdGlvbixcbiAgU3RhdGVtZW50LFxuICBQcm9ncmFtLFxuICBOb2RlS2luZCxcbiAgUGFyc2VyLFxufSBmcm9tIFwidmlzaXRvci1hcy9hc1wiO1xuaW1wb3J0IHsgdXRpbHMsIEJhc2VWaXNpdG9yLCBTaW1wbGVQYXJzZXIgfSBmcm9tIFwidmlzaXRvci1hc1wiO1xuaW1wb3J0IHtcbiAgY3JlYXRlRGVjb2RlU3RhdGVtZW50LFxuICBpc0VudHJ5LFxuICBORUFSX0RFQ09SQVRPUixcbiAgbnVtT2ZQYXJhbWV0ZXJzLFxuICBwYXJzZVRvcExldmVsU3RhdGVtZW50cyxcbiAgcmV0dXJuc1ZvaWQsXG4gIFdSQVBQRVJfUFJFRklYLFxufSBmcm9tIFwiLi9jb21tb25cIjtcbmltcG9ydCB7IGdldE5hbWUsIG1ha2VTbmFrZUNhc2UsIHRvU3RyaW5nIH0gZnJvbSBcIi4vdXRpbHNcIjtcbmltcG9ydCB7IFJhbmdlVHJhbnNmb3JtIH0gZnJvbSBcInZpc2l0b3ItYXMvZGlzdC90cmFuc2Zvcm1SYW5nZVwiO1xuXG5leHBvcnQgY2xhc3MgRnVuY3Rpb25DbGFzcyBleHRlbmRzIEJhc2VWaXNpdG9yIHtcbiAgX2NsYXNzITogQ2xhc3NEZWNsYXJhdGlvbjtcblxuICB2aXNpdEZ1bmN0aW9uRGVjbGFyYXRpb24obm9kZTogRnVuY3Rpb25EZWNsYXJhdGlvbik6IHZvaWQge1xuICAgIGxldCBuYW1lID0gZ2V0TmFtZShub2RlKTtcbiAgICBsZXQgZmllbGRzID0gbm9kZS5zaWduYXR1cmUucGFyYW1ldGVycy5tYXAoXG4gICAgICAocCkgPT5cbiAgICAgICAgYCR7dG9TdHJpbmcocC5uYW1lKX06ICR7Z2V0TmFtZShwLnR5cGUpfSR7XG4gICAgICAgICAgcC5pbml0aWFsaXplciA/IFwiID0gXCIgKyB0b1N0cmluZyhwLmluaXRpYWxpemVyKSA6IFwiXCJcbiAgICAgICAgfWBcbiAgICApO1xuICAgIGxldCBwYXJhbXMgPSBub2RlLnNpZ25hdHVyZS5wYXJhbWV0ZXJzLm1hcCgocCkgPT4gYHRoaXMuJHtnZXROYW1lKHApfWApO1xuICAgIGlmIChmaWVsZHMubGVuZ3RoID4gMCkge1xuICAgICAgLy8gYWRkIGJsYW5rIHRvIG1ha2Ugam9pbiBhZGQgO1xuICAgICAgZmllbGRzLnB1c2goXCJcIik7XG4gICAgfVxuXG4gICAgY29uc3QgZmllbGRTdHJzID0gZmllbGRzLmpvaW4oXCI7XFxuXCIpO1xuICAgIGxldCBfY2xhc3NTdHIgPSBgY2xhc3MgJHtuYW1lfV9fY2xhc3Mge1xuICAke2ZpZWxkU3Ryc31cbiAgY2FsbCgpOiAke2dldE5hbWUobm9kZS5zaWduYXR1cmUucmV0dXJuVHlwZSl9IHtcbiAgICAke3JldHVybnNWb2lkKG5vZGUpID8gXCJcIiA6IFwicmV0dXJuIFwifSR7bmFtZX0oJHtwYXJhbXMuam9pbihcIixcIil9KTtcbiAgfVxufWA7XG4gICAgbGV0IF9jbGFzcyA9IDxDbGFzc0RlY2xhcmF0aW9uPihcbiAgICAgIFNpbXBsZVBhcnNlci5wYXJzZVRvcExldmVsU3RhdGVtZW50KF9jbGFzc1N0cilcbiAgICApO1xuICAgIC8vIE1ldGhvZEluamVjdG9yLnZpc2l0KF9jbGFzcyk7XG4gICAgdGhpcy5fY2xhc3MgPSBfY2xhc3M7XG4gIH1cblxuICBzdGF0aWMgdmlzaXQobm9kZTogRnVuY3Rpb25EZWNsYXJhdGlvbik6IENsYXNzRGVjbGFyYXRpb24ge1xuICAgIGNvbnN0IGZ1bmNDbGFzcyA9IG5ldyBGdW5jdGlvbkNsYXNzKCk7XG4gICAgZnVuY0NsYXNzLnZpc2l0KG5vZGUpO1xuICAgIHJldHVybiBmdW5jQ2xhc3MuX2NsYXNzO1xuICB9XG59XG5cbmZ1bmN0aW9uIGVtcHR5U2lnbmF0dXJlKG5vZGU6IEZ1bmN0aW9uRGVjbGFyYXRpb24pOiBib29sZWFuIHtcbiAgcmV0dXJuIG51bU9mUGFyYW1ldGVycyhub2RlKSA9PSAwICYmIHJldHVybnNWb2lkKG5vZGUpO1xufVxuZXhwb3J0IGNsYXNzIEZ1bmN0aW9uRXhwb3J0V3JhcHBlciBleHRlbmRzIEJhc2VWaXNpdG9yIHtcbiAgc3RhdGljIGlzVGVzdDogYm9vbGVhbiA9IGZhbHNlO1xuICBmdW5jdGlvbnM6IFN0YXRlbWVudFtdID0gW107XG4gIGV4cG9ydHM6IHN0cmluZ1tdID0gW107XG4gIHdyYXBwZWRGdW5jczogU2V0PHN0cmluZz4gPSBuZXcgU2V0KCk7XG4gIGNsYXNzV3JhcHBlcnM6IENsYXNzRGVjbGFyYXRpb25bXSA9IFtdO1xuXG4gIHN0YXRpYyBjaGVja1Rlc3RCdWlsZChzb3VyY2VzOiBTb3VyY2VbXSkge1xuICAgIHRoaXMuaXNUZXN0ID0gc291cmNlcy5zb21lKChzKSA9PiBzLm5vcm1hbGl6ZWRQYXRoLmluY2x1ZGVzKFwiLnNwZWMuXCIpKTtcbiAgfVxuXG4gIG5lZWRzV3JhcHBlcihub2RlOiBGdW5jdGlvbkRlY2xhcmF0aW9uKTogYm9vbGVhbiB7XG4gICAgbGV0IGlzRXhwb3J0ID0gbm9kZS5pcyhDb21tb25GbGFncy5FWFBPUlQpO1xuICAgIGxldCBhbHJlYWR5V3JhcHBlZCA9IHRoaXMud3JhcHBlZEZ1bmNzLmhhcyh0b1N0cmluZyhub2RlLm5hbWUpKTtcbiAgICBsZXQgbm9JbnB1dE9yT3V0cHV0ID0gZW1wdHlTaWduYXR1cmUobm9kZSk7XG4gICAgaWYgKFxuICAgICAgIWlzRXhwb3J0IHx8XG4gICAgICBhbHJlYWR5V3JhcHBlZCB8fFxuICAgICAgbm9JbnB1dE9yT3V0cHV0IHx8XG4gICAgICBGdW5jdGlvbkV4cG9ydFdyYXBwZXIuaXNUZXN0XG4gICAgKVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIHJldHVybiBpc0VudHJ5KG5vZGUpIHx8IHV0aWxzLmhhc0RlY29yYXRvcihub2RlLCBORUFSX0RFQ09SQVRPUik7XG4gIH1cblxuICB2aXNpdEZ1bmN0aW9uRGVjbGFyYXRpb24obm9kZTogRnVuY3Rpb25EZWNsYXJhdGlvbik6IHZvaWQge1xuICAgIGNvbnN0IG5hbWUgPSB0b1N0cmluZyhub2RlLm5hbWUpO1xuICAgIGlmICghdGhpcy5uZWVkc1dyYXBwZXIobm9kZSkpIHtcbiAgICAgIGlmIChcbiAgICAgICAgKGlzRW50cnkobm9kZSkgfHwgdXRpbHMuaGFzRGVjb3JhdG9yKG5vZGUsIE5FQVJfREVDT1JBVE9SKSkgJiZcbiAgICAgICAgIXRoaXMud3JhcHBlZEZ1bmNzLmhhcyhuYW1lKSAmJlxuICAgICAgICBub2RlLmlzKENvbW1vbkZsYWdzLkVYUE9SVClcbiAgICAgICkge1xuICAgICAgICBjb25zdCBzbmFrZUNhc2UgPSB0aGlzLmNhbWVsQ2FzZVRvU25ha2VDYXNlRXhwb3J0KG5hbWUsIFwiXCIpO1xuICAgICAgICB0aGlzLndyYXBwZWRGdW5jcy5hZGQobmFtZSk7XG4gICAgICAgIGlmIChzbmFrZUNhc2UpIHtcbiAgICAgICAgICB0aGlzLmV4cG9ydHMucHVzaChzbmFrZUNhc2UpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBzdXBlci52aXNpdEZ1bmN0aW9uRGVjbGFyYXRpb24obm9kZSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChudW1PZlBhcmFtZXRlcnMobm9kZSkgPiAwKSB7XG4gICAgICBjb25zdCBfY2xhc3MgPSBGdW5jdGlvbkNsYXNzLnZpc2l0KG5vZGUpO1xuICAgICAgUmFuZ2VUcmFuc2Zvcm0udmlzaXQoX2NsYXNzLCBub2RlKTtcbiAgICAgIHRoaXMuY2xhc3NXcmFwcGVycy5wdXNoKF9jbGFzcyk7XG4gICAgfVxuICAgIHRoaXMuZnVuY3Rpb25zLnB1c2goXG4gICAgICBwYXJzZVRvcExldmVsU3RhdGVtZW50cyh0aGlzLmdlbmVyYXRlV3JhcHBlckZ1bmN0aW9uKG5vZGUpKVswXVxuICAgICk7XG4gICAgLy8gQ2hhbmdlIGZ1bmN0aW9uIHRvIG5vdCBiZSBhbiBleHBvcnRcbiAgICBub2RlLmZsYWdzID0gbm9kZS5mbGFncyBeIENvbW1vbkZsYWdzLkVYUE9SVDtcbiAgICB0aGlzLndyYXBwZWRGdW5jcy5hZGQobmFtZSk7XG4gIH1cblxuICBjYW1lbENhc2VUb1NuYWtlQ2FzZUV4cG9ydChcbiAgICBuYW1lOiBzdHJpbmcsXG4gICAgcHJlZml4OiBzdHJpbmcgPSBXUkFQUEVSX1BSRUZJWFxuICApOiBzdHJpbmcge1xuICAgIGxldCBzID0gbWFrZVNuYWtlQ2FzZShuYW1lKTtcbiAgICBpZiAocy5ub3JtYWxpemUoKSA9PT0gbmFtZS5ub3JtYWxpemUoKSkge1xuICAgICAgcmV0dXJuIFwiXCI7XG4gICAgfVxuICAgIHJldHVybiBgZXhwb3J0IHsgJHtwcmVmaXggKyBuYW1lfSBhcyAke3N9IH1gO1xuICB9XG5cbiAgLypcbiAgQ3JlYXRlIGEgd3JhcHBlciBmdW5jdGlvbiB0aGF0IHdpbGwgYmUgZXhwb3J0IGluIHRoZSBmdW5jdGlvbidzIHBsYWNlLlxuICAqL1xuICBwcml2YXRlIGdlbmVyYXRlV3JhcHBlckZ1bmN0aW9uKGZ1bmM6IEZ1bmN0aW9uRGVjbGFyYXRpb24pOiBzdHJpbmcge1xuICAgIGxldCBmdW5jU291cmNlOiBzdHJpbmdbXSA9IFtdO1xuICAgIGxldCBzaWduYXR1cmUgPSBmdW5jLnNpZ25hdHVyZTtcbiAgICBsZXQgcGFyYW1zID0gc2lnbmF0dXJlLnBhcmFtZXRlcnM7XG4gICAgbGV0IHJldHVyblR5cGUgPSBzaWduYXR1cmUucmV0dXJuVHlwZTtcbiAgICBsZXQgcmV0dXJuVHlwZU5hbWUgPSB0b1N0cmluZyhyZXR1cm5UeXBlKTtcbiAgICBsZXQgbmFtZSA9IGdldE5hbWUoZnVuYyk7XG4gICAgaWYgKGZ1bmMuZGVjb3JhdG9ycyAmJiBmdW5jLmRlY29yYXRvcnMubGVuZ3RoID4gMCkge1xuICAgICAgZnVuY1NvdXJjZS5wdXNoKFxuICAgICAgICBmdW5jLmRlY29yYXRvcnMubWFwKChkZWNvcmF0b3IpID0+IHRvU3RyaW5nKGRlY29yYXRvcikpLmpvaW4oXCJcXG5cIilcbiAgICAgICk7XG4gICAgfVxuICAgIGNvbnN0IGNsYXNzTmFtZSA9IG5hbWUgKyBcIl9fY2xhc3NcIjtcbiAgICBmdW5jU291cmNlLnB1c2goYFxuICAgIGZ1bmN0aW9uIF9fd3JhcHBlcl8ke25hbWV9KCk6IHZvaWQge2ApO1xuICAgIGlmIChwYXJhbXMubGVuZ3RoID4gMCkge1xuICAgICAgZnVuY1NvdXJjZS5wdXNoKFxuICAgICAgICBgICBjb25zdCBfY2xhc3MgPSBKU09OLnBhcnNlPCR7Y2xhc3NOYW1lfT4oZ2V0SW5wdXRTdHJpbmcoKSlgXG4gICAgICApO1xuICAgIH1cbiAgICBpZiAocmV0dXJuVHlwZU5hbWUgIT09IFwidm9pZFwiKSB7XG4gICAgICBpZiAocGFyYW1zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgZnVuY1NvdXJjZS5wdXNoKGBsZXQgcmVzdWx0OiAke3JldHVyblR5cGVOYW1lfSA9IF9jbGFzcy5jYWxsKCk7YCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmdW5jU291cmNlLnB1c2goYGxldCByZXN1bHQ6ICR7cmV0dXJuVHlwZU5hbWV9ID0gJHtuYW1lfSgpO2ApO1xuICAgICAgfVxuICAgICAgZnVuY1NvdXJjZS5wdXNoKGBcbiAgICAgIGNvbnN0IHZhbCA9IFN0cmluZy5VVEY4LmVuY29kZShKU09OLnN0cmluZ2lmeShyZXN1bHQpKTtcbiAgICAgIHZhbHVlX3JldHVybih2YWwuYnl0ZUxlbmd0aCwgY2hhbmdldHlwZTx1c2l6ZT4odmFsKSk7XG4gIGApO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAocGFyYW1zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgZnVuY1NvdXJjZS5wdXNoKGBfY2xhc3MuY2FsbCgpYCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmdW5jU291cmNlLnB1c2goYCR7bmFtZX0oKTtgKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZnVuY1NvdXJjZS5wdXNoKGB9YCk7XG4gICAgdGhpcy5hZGRFeHBvcnQobmFtZSk7XG4gICAgcmV0dXJuIGZ1bmNTb3VyY2Uuam9pbihcIlxcblwiKTtcbiAgfVxuXG4gIGFkZEV4cG9ydChuYW1lOiBzdHJpbmcpOiB2b2lkIHtcbiAgICB0aGlzLmV4cG9ydHMucHVzaChgZXhwb3J0IHske1dSQVBQRVJfUFJFRklYICsgbmFtZX0gYXMgJHtuYW1lfX1gKTtcbiAgICBsZXQgcmVzID0gdGhpcy5jYW1lbENhc2VUb1NuYWtlQ2FzZUV4cG9ydChuYW1lLCBXUkFQUEVSX1BSRUZJWCk7XG4gICAgaWYgKHJlcykge1xuICAgICAgdGhpcy5leHBvcnRzLnB1c2gocmVzKTtcbiAgICB9XG4gIH1cblxuICB2aXNpdFNvdXJjZShub2RlOiBTb3VyY2UpOiB2b2lkIHtcbiAgICBzdXBlci52aXNpdFNvdXJjZShub2RlKTtcbiAgICBjb25zdCBuZXdQYXJzZXIgPSBuZXcgUGFyc2VyKCk7XG4gICAgY29uc3QgbGFzdFN0YXRlbWVudCA9XG4gICAgICAobm9kZS5zdGF0ZW1lbnRzLmxlbmd0aCAmJiBub2RlLnN0YXRlbWVudHNbbm9kZS5zdGF0ZW1lbnRzLmxlbmd0aCAtIDFdKSB8fFxuICAgICAgbm9kZTtcbiAgICBpZiAodGhpcy5mdW5jdGlvbnMubGVuZ3RoID4gMCkge1xuICAgICAgbm9kZS5zdGF0ZW1lbnRzLnB1c2goXG4gICAgICAgIC4uLnRoaXMuZnVuY3Rpb25zLm1hcCgobikgPT4gUmFuZ2VUcmFuc2Zvcm0udmlzaXQobiwgbGFzdFN0YXRlbWVudCkpXG4gICAgICApO1xuXG4gICAgICBjb25zdCBzdHIgPSB0aGlzLmV4cG9ydHMuam9pbihcIlxcblwiKTtcbiAgICAgIG5ld1BhcnNlci5wYXJzZUZpbGUoc3RyLCBub2RlLm5vcm1hbGl6ZWRQYXRoLCBpc0VudHJ5KG5vZGUpKTtcbiAgICAgIGNvbnN0IGV4cG9ydHNTb3VyY2UgPSBuZXdQYXJzZXIuc291cmNlc1swXTtcbiAgICAgIG5vZGUuc3RhdGVtZW50cyA9IG5vZGUuc3RhdGVtZW50cy5jb25jYXQoZXhwb3J0c1NvdXJjZS5zdGF0ZW1lbnRzKTtcbiAgICAgIG5vZGUuc3RhdGVtZW50cy5wdXNoKC4uLnRoaXMuY2xhc3NXcmFwcGVycyk7XG4gICAgfVxuICB9XG5cbiAgc3RhdGljIHZpc2l0KHNvdXJjZXM6IFNvdXJjZVtdKTogdm9pZCB7XG4gICAgRnVuY3Rpb25FeHBvcnRXcmFwcGVyLmNoZWNrVGVzdEJ1aWxkKHNvdXJjZXMpO1xuICAgIHNvdXJjZXMuZm9yRWFjaCgocykgPT4ge1xuICAgICAgbmV3IEZ1bmN0aW9uRXhwb3J0V3JhcHBlcigpLnZpc2l0KHMpO1xuICAgIH0pO1xuICB9XG59XG4iXX0=