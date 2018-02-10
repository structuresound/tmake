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
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
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
        return this.collections.projects.update({ name: project.name }, modifier);
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
    Database.prototype.registerPackage = function (entry) {
        return this.collections.registry.update({ name: entry.name }, { $set: entry }, { upsert: true });
    };
    Database.prototype.getPackage = function (entry) {
        var name = entry.name, user = entry.user, tag = entry.tag;
        var query = __assign({
            user: 'local',
            tag: 'latest'
        }, entry);
        return this.collections.registry.findOne(query);
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
        var cacheDir = path_1.join(tmake_core_1.args.homeDir, 'state');
        var dbPaths = {
            registry: path_1.join(cacheDir, 'registry.json'),
            projects: path_1.join(cacheDir, 'projects.json'),
            configurations: path_1.join(cacheDir, 'configurations.json'),
            errors: path_1.join(cacheDir, 'errors.json')
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
            return new Datastore({ filename: val, autoload: true });
        });
        return _this;
    }
    return ClientDb;
}(Database));
exports.ClientDb = ClientDb;
