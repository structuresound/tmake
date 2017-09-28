"use strict";
/// <reference path="../interfaces/db.d.ts" />
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
var Datastore = require("nedb-promise");
var path_1 = require("path");
var fs = require("fs");
var Bluebird = require("bluebird");
var typed_json_transform_1 = require("typed-json-transform");
var tmake_core_1 = require("tmake-core");
var Database = /** @class */ (function () {
    function Database() {
    }
    Database.prototype.insertProject = function (project) {
        console.log('insert project', project);
        return this.collections.projects.update({ name: project.name }, { $set: project }, { upsert: true });
    };
    Database.prototype.projectNamed = function (name) {
        return this.collections.projects.findOne({ name: name });
    };
    Database.prototype.findProjects = function (query) {
        return this.collections.projects.find({ name: name });
    };
    Database.prototype.updateProject = function (project, modifier) {
        console.log('update project', modifier);
        return this.collections.projects.update({ name: project.parsed.name }, modifier);
    };
    Database.prototype.removeProject = function (name, version) {
        if (version) {
            return this.collections.projects.remove({ name: name, version: version });
        }
        return this.collections.projects.remove({ name: name });
    };
    Database.prototype.loadConfiguration = function (hash) {
        return this.collections.configurations.findOne({ _id: hash });
    };
    Database.prototype.cacheConfiguration = function (doc) {
        var _this = this;
        return this.loadConfiguration(doc._id)
            .then(function (res) {
            if (res) {
                return _this.collections.configurations.update({ _id: res._id }, { $set: doc });
            }
            return _this.collections.configurations.insert(doc);
        }).then(function (res) { return Bluebird.resolve(res._id); });
    };
    Database.prototype.cleanConfigurations = function (projectName) {
        return this.collections.configurations.remove({ project: projectName });
    };
    Database.prototype.cleanConfiguration = function (hash) {
        return this.collections.configurations.remove({ _id: hash });
    };
    Database.prototype.insertReport = function (report) {
        return this.collections.errors.insert(report);
    };
    Database.prototype.getReports = function () {
        return this.collections.errors.find({});
    };
    Database.prototype.reset = function () {
    };
    return Database;
}());
exports.Database = Database;
var ClientDb = /** @class */ (function (_super) {
    __extends(ClientDb, _super);
    function ClientDb() {
        var _this = _super.call(this) || this;
        var cacheDir = path_1.join(tmake_core_1.args.runDir, tmake_core_1.args.cachePath);
        var dbPaths = {
            projects: path_1.join(cacheDir, 'projects.db'),
            configurations: path_1.join(cacheDir, 'environments.db'),
            errors: path_1.join(cacheDir, 'errors.db')
        };
        var testMode = ((process.env.NODE_ENV === 'test') || process.env.LOADED_MOCHA_OPTS);
        if (testMode) {
            try {
                Object.keys(dbPaths).forEach(function (key) {
                    fs.unlinkSync(dbPaths[key]);
                });
            }
            catch (e) { }
        }
        _this.collections = typed_json_transform_1.okmap(dbPaths, function (val, key) {
            return _a = {}, _a[key] = new Datastore({ filename: val, autoload: true }), _a;
            var _a;
        });
        return _this;
    }
    return ClientDb;
}(Database));
exports.ClientDb = ClientDb;
