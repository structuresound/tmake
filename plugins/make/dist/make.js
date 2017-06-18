"use strict";
/// <reference path="../interfaces/make.d.ts" />
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
var tmake_core_1 = require("tmake-core");
var Make = (function (_super) {
    __extends(Make, _super);
    function Make(environment, options) {
        var _this = _super.call(this, environment) || this;
        _this.name = 'make';
        _this.buildFileName = 'Makefile';
        return _this;
    }
    Make.prototype.configureCommand = function () {
        return [
            this.options.prefix,
            './configure',
            tmake_core_1.jsonToFlags(this.options.arguments, { prefix: '' }).join(' '),
            tmake_core_1.jsonToFlags(this.options.flags, { prefix: '--' }).join(' ')
        ].join(' ');
    };
    Make.prototype.buildCommand = function () {
        return [
            this.options.prefix,
            'make -j' + tmake_core_1.Runtime.j(),
            tmake_core_1.jsonToFlags(this.options.arguments, { prefix: '' }).join(' '),
        ].join(' ');
    };
    Make.prototype.installCommand = function () {
        return [
            this.options.prefix,
            'make install',
            tmake_core_1.jsonToFlags(this.options.arguments, { prefix: '' }).join(' '),
        ].join(' ');
    };
    return Make;
}(tmake_core_1.Compiler));
exports.Make = Make;
exports.default = Make;
