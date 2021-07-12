"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JSONTransformer = void 0;
const as_1 = require("visitor-as/as");
// import { JSONBindingsBuilder } from "./JSONBuilder";
const classExporter_1 = require("./classExporter");
const visitor_as_1 = require("visitor-as");
const common_1 = require("./common");
const functionWrapper_1 = require("./functionWrapper");
const methodInjector_1 = require("@serial-as/transform/dist/methodInjector");
const utils_1 = require("./utils");
const regex = /\/\/.*@nearfile .*out/;
class JSONTransformer extends as_1.Transform {
    parser;
    afterParse(parser) {
        this.parser = parser;
        const writeFile = this.writeFile;
        const baseDir = this.baseDir;
        // Filter for near files
        const sources = common_1.nearFiles(this.parser.sources);
        classExporter_1.ClassExporter.visit(sources);
        functionWrapper_1.FunctionExportWrapper.visit(sources);
        this.parser.sources.forEach(methodInjector_1.MethodInjector.visit);
        sources.forEach((source) => {
            if (regex.test(source.text))
                writeFile(utils_1.posixRelativePath("out", source.normalizedPath), visitor_as_1.utils.toString(source), baseDir);
        });
        classExporter_1.ClassExporter.classSeen = null;
    }
}
exports.JSONTransformer = JSONTransformer;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNmb3JtZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvdHJhbnNmb3JtZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsc0NBQStFO0FBQy9FLHVEQUF1RDtBQUN2RCxtREFBZ0Q7QUFDaEQsMkNBQW1DO0FBRW5DLHFDQUFxQztBQUNyQyx1REFBMEQ7QUFDMUQsNkVBQTBFO0FBQzFFLG1DQUE0QztBQUU1QyxNQUFNLEtBQUssR0FBRyx1QkFBdUIsQ0FBQztBQUN0QyxNQUFNLGVBQWdCLFNBQVEsY0FBUztJQUNyQyxNQUFNLENBQVM7SUFFZixVQUFVLENBQUMsTUFBYztRQUN2QixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUNyQixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDO1FBQ2pDLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUM7UUFFN0Isd0JBQXdCO1FBQ3hCLE1BQU0sT0FBTyxHQUFHLGtCQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUMvQyw2QkFBYSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM3Qix1Q0FBcUIsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDckMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLCtCQUFjLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFbEQsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQ3pCLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDO2dCQUN6QixTQUFTLENBQ1AseUJBQWlCLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxjQUFjLENBQUMsRUFDL0Msa0JBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQ3RCLE9BQU8sQ0FDUixDQUFDO1FBQ04sQ0FBQyxDQUFDLENBQUM7UUFFSCw2QkFBYSxDQUFDLFNBQVMsR0FBRyxJQUFLLENBQUM7SUFDbEMsQ0FBQztDQUNGO0FBRVEsMENBQWUiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBUcmFuc2Zvcm0sIFBhcnNlciwgUHJvZ3JhbSwgTW9kdWxlLCBTb3VyY2VLaW5kIH0gZnJvbSBcInZpc2l0b3ItYXMvYXNcIjtcbi8vIGltcG9ydCB7IEpTT05CaW5kaW5nc0J1aWxkZXIgfSBmcm9tIFwiLi9KU09OQnVpbGRlclwiO1xuaW1wb3J0IHsgQ2xhc3NFeHBvcnRlciB9IGZyb20gXCIuL2NsYXNzRXhwb3J0ZXJcIjtcbmltcG9ydCB7IHV0aWxzIH0gZnJvbSBcInZpc2l0b3ItYXNcIjtcbmltcG9ydCAqIGFzIHBhdGggZnJvbSBcInBhdGhcIjtcbmltcG9ydCB7IG5lYXJGaWxlcyB9IGZyb20gXCIuL2NvbW1vblwiO1xuaW1wb3J0IHsgRnVuY3Rpb25FeHBvcnRXcmFwcGVyIH0gZnJvbSBcIi4vZnVuY3Rpb25XcmFwcGVyXCI7XG5pbXBvcnQgeyBNZXRob2RJbmplY3RvciB9IGZyb20gXCJAc2VyaWFsLWFzL3RyYW5zZm9ybS9kaXN0L21ldGhvZEluamVjdG9yXCI7XG5pbXBvcnQgeyBwb3NpeFJlbGF0aXZlUGF0aCB9IGZyb20gXCIuL3V0aWxzXCI7XG5cbmNvbnN0IHJlZ2V4ID0gL1xcL1xcLy4qQG5lYXJmaWxlIC4qb3V0LztcbmNsYXNzIEpTT05UcmFuc2Zvcm1lciBleHRlbmRzIFRyYW5zZm9ybSB7XG4gIHBhcnNlcjogUGFyc2VyO1xuXG4gIGFmdGVyUGFyc2UocGFyc2VyOiBQYXJzZXIpOiB2b2lkIHtcbiAgICB0aGlzLnBhcnNlciA9IHBhcnNlcjtcbiAgICBjb25zdCB3cml0ZUZpbGUgPSB0aGlzLndyaXRlRmlsZTtcbiAgICBjb25zdCBiYXNlRGlyID0gdGhpcy5iYXNlRGlyO1xuXG4gICAgLy8gRmlsdGVyIGZvciBuZWFyIGZpbGVzXG4gICAgY29uc3Qgc291cmNlcyA9IG5lYXJGaWxlcyh0aGlzLnBhcnNlci5zb3VyY2VzKTtcbiAgICBDbGFzc0V4cG9ydGVyLnZpc2l0KHNvdXJjZXMpO1xuICAgIEZ1bmN0aW9uRXhwb3J0V3JhcHBlci52aXNpdChzb3VyY2VzKTtcbiAgICB0aGlzLnBhcnNlci5zb3VyY2VzLmZvckVhY2goTWV0aG9kSW5qZWN0b3IudmlzaXQpO1xuXG4gICAgc291cmNlcy5mb3JFYWNoKChzb3VyY2UpID0+IHtcbiAgICAgIGlmIChyZWdleC50ZXN0KHNvdXJjZS50ZXh0KSlcbiAgICAgICAgd3JpdGVGaWxlKFxuICAgICAgICAgIHBvc2l4UmVsYXRpdmVQYXRoKFwib3V0XCIsIHNvdXJjZS5ub3JtYWxpemVkUGF0aCksXG4gICAgICAgICAgdXRpbHMudG9TdHJpbmcoc291cmNlKSxcbiAgICAgICAgICBiYXNlRGlyXG4gICAgICAgICk7XG4gICAgfSk7XG5cbiAgICBDbGFzc0V4cG9ydGVyLmNsYXNzU2VlbiA9IG51bGwhO1xuICB9XG59XG5cbmV4cG9ydCB7IEpTT05UcmFuc2Zvcm1lciB9O1xuIl19