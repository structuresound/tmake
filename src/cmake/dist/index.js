"use strict";
/// <reference path="../interfaces/index.d.ts" />
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var path_1 = require("path");
var typed_json_transform_1 = require("typed-json-transform");
var tmake_core_1 = require("tmake-core");
function quotedList(array) {
    return typed_json_transform_1.map(array, function (el) {
        return "\"" + el + "\"";
    }).join(' ');
}
exports.quotedList = quotedList;
var CMake = /** @class */ (function (_super) {
    __extends(CMake, _super);
    function CMake(configuration, options) {
        var _this = _super.call(this, configuration, options) || this;
        _this.name = 'cmake';
        _this.projectFileName = 'CMakeLists.txt';
        _this.buildFileName = 'build.ninja';
        return _this;
    }
    CMake.prototype.configureCommand = function () {
        var defines = this.options.defines || {};
        var cMakeDefines = typed_json_transform_1.extend({
            LIBRARY_OUTPUT_PATH: this.configuration.parsed.d.install.libraries[0].from
        }, defines);
        var command = "cmake -G Ninja -DCMAKE_MAKE_PROGRAM=" + tmake_core_1.defaults.host.tools.ninja.bin + " " + this.configuration.parsed.d.project;
        for (var _i = 0, _a = Object.keys(cMakeDefines); _i < _a.length; _i++) {
            var k = _a[_i];
            var value = cMakeDefines[k];
            if (typed_json_transform_1.check(value, String)) {
                if (tmake_core_1.startsWith(value, '~/')) {
                    value = this.configuration.parsed.d.home + "/" + value.slice(2);
                }
            }
            command += " -D" + k + "=" + value;
        }
        return command;
    };
    CMake.prototype.buildCommand = function () {
        return tmake_core_1.defaults.host.tools.ninja.bin;
    };
    CMake.prototype.fetch = function () {
        var _this = this;
        return tmake_core_1.Tools.fetch(this.options.toolchain || tmake_core_1.defaults.host.tools).then(function (toolpaths) { return _this.toolpaths = toolpaths; });
    };
    CMake.prototype.generate = function () {
        var _this = this;
        var header = function () {
            var pv = _this.options.version || '0.0.1';
            if (tmake_core_1.startsWith(pv, 'v')) {
                pv = pv.slice(1);
            }
            var version = _this.options.minimumVersion || '3.2';
            return "\n# generated by trieMake\ncmake_minimum_required(VERSION " + version + ")\nproject(" + _this.configuration.project.parsed.name + " VERSION " + pv + ")";
        };
        var includeDirectories = function () {
            switch (_this.configuration.parsed.target.output.type) {
                case 'static':
                case 'dynamic':
                case 'executable':
                default:
                    return "include_directories(" + quotedList(_this.options.includeDirs) + ")";
            }
        };
        var matching = function () {
            var relativeToSource = path_1.relative(_this.configuration.parsed.d.project, _this.configuration.parsed.d.source) || '.';
            var src = typed_json_transform_1.map(_this.configuration.parsed.s, function (fp) {
                return path_1.join(relativeToSource, fp);
            });
            return "\n\nset(SOURCE_FILES ${SOURCE_FILES} " + quotedList(src) + ")";
        };
        var flags = function () {
            var cxxFlags = _this.cppFlags().join(' ');
            return "\nset(CMAKE_CXX_FLAGS \"${CMAKE_CXX_FLAGS} " + cxxFlags + "\")\nset(CMAKE_C_FLAGS \"${CMAKE_C_FLAGS} " + _this.cFlags().join(' ') + "\")";
        };
        var target = function () {
            switch (_this.configuration.parsed.target.output.type) {
                case 'static':
                default:
                    return "\nadd_library(" + _this.configuration.project.parsed.name + " STATIC ${SOURCE_FILES})";
                case 'executable':
                    return "\nadd_executable(" + _this.configuration.project.parsed.name + " ${SOURCE_FILES})";
            }
        };
        var link = function () {
            var linkLibs = quotedList(_this.options.libs.reverse());
            var frameworks = quotedList(_this.frameworks());
            if (linkLibs.length || frameworks.length) {
                return "\ntarget_link_libraries(${PROJECT_NAME} " + linkLibs + " " + frameworks + " " + _this.linkerFlags().join(' ') + ")\n";
            }
            return '';
        };
        return header() +
            includeDirectories() +
            matching() +
            flags() +
            target() +
            link();
    };
    return CMake;
}(tmake_core_1.Compiler));
exports.CMake = CMake;
exports.default = CMake;
