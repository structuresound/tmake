"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Datastore = require("nedb-promise");
var path_1 = require("path");
var fs = require("fs");
var Bluebird = require("bluebird");
var typed_json_transform_1 = require("typed-json-transform");
var tmake_core_1 = require("tmake-core");
var Database = (function () {
    function Database() {
        var cacheDir = path_1.join(tmake_core_1.args.runDir, tmake_core_1.args.cachePath);
        var dbPaths = {
            project: path_1.join(cacheDir, 'project.db'),
            environment: path_1.join(cacheDir, 'environment.db'),
            error: path_1.join(cacheDir, 'error.db')
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
        this.collections = typed_json_transform_1.okmap(dbPaths, function (val, key) {
            return _a = {}, _a[key] = new Datastore({ filename: val, autoload: true }), _a;
            var _a;
        });
    }
    Database.prototype.insertProject = function (project) {
        console.log('insert project', project);
        return this.collections.project.update({ name: project.name }, { $set: project }, { upsert: true });
    };
    Database.prototype.projectNamed = function (name) {
        return this.collections.project.findOne({ name: name });
    };
    Database.prototype.findProjects = function (query) {
        return this.collections.project.find({ name: name });
    };
    Database.prototype.updateProject = function (project, modifier) {
        console.log('update project', modifier);
        return this.collections.project.update({ name: project.name }, modifier);
    };
    Database.prototype.removeProject = function (name, version) {
        if (version) {
            return this.collections.project.remove({ name: name, version: version });
        }
        return this.collections.project.remove({ name: name });
    };
    Database.prototype.loadEnvironment = function (hash) {
        return this.collections.environment.findOne({ _id: hash });
    };
    Database.prototype.cacheEnvironment = function (doc) {
        var _this = this;
        return this.loadEnvironment(doc._id).then(function (res) {
            if (res) {
                return _this.collections.environment.update({ _id: res._id }, { $set: doc })
                    .then(function () { return Bluebird.resolve(res._id); });
            }
            return _this.collections.environment.insert(doc);
        });
    };
    Database.prototype.cleanEnvironments = function (projectName) {
        return this.collections.environment.remove({ project: projectName });
    };
    Database.prototype.cleanEnvironment = function (hash) {
        return this.collections.environment.remove({ _id: hash });
    };
    Database.prototype.insertReport = function (report) {
        return this.collections.error.insert(report);
    };
    Database.prototype.getReports = function () {
        return this.collections.error.find();
    };
    Database.prototype.reset = function () {
    };
    return Database;
}());
exports.Database = Database;
