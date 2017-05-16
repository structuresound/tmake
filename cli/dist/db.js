"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Datastore = require("nedb-promise");
var path = require("path");
var fs = require("fs");
var Bluebird = require("bluebird");
var Database = (function () {
    function Database(args) {
        var _this = this;
        var dbPaths;
        var testMode = ((process.env.NODE_ENV === 'test') || process.env.LOADED_MOCHA_OPTS);
        if (testMode) {
            dbPaths = {
                project: path.join(args.userCache, 'project.db'),
                environment: path.join(args.userCache, 'environment.db'),
                error: path.join(args.userCache, 'error.db')
            };
            try {
                Object.keys(dbPaths).forEach(function (key) {
                    fs.unlinkSync(dbPaths[key]);
                });
            }
            catch (e) { }
        }
        else {
            var cacheDir = path.join(args.runDir, args.cachePath);
            dbPaths = {
                project: path.join(args.userCache, 'project.db'),
                environment: path.join(args.userCache, 'environment.db'),
                error: path.join(args.userCache, 'error.db')
            };
        }
        var userDbPath = args.userCache + "/packages.db";
        Object.keys(dbPaths).forEach(function (key) {
            _this[key] = new Datastore({ filename: dbPaths[key], autoload: true });
        });
    }
    Database.prototype.insertProject = function (project) {
        return this.project.update({ name: project.name }, { $set: project }, { upsert: true });
    };
    Database.prototype.projectNamed = function (name) {
        return this.project.findOne({ name: name });
    };
    Database.prototype.findProjects = function (query) {
        return this.project.find({ name: name });
    };
    Database.prototype.updateProject = function (node, modifier) {
        return this.project.update({ name: node.name }, modifier, { upsert: true });
    };
    Database.prototype.removeProject = function (name, version) {
        if (version) {
            return this.project.remove({ name: name, version: version });
        }
        return this.project.remove({ name: name });
    };
    Database.prototype.loadEnvironment = function (hash) {
        return this.environment.findOne({ _id: hash });
    };
    Database.prototype.cacheEnvironment = function (doc) {
        var _this = this;
        return this.loadEnvironment(doc._id).then(function (res) {
            if (res) {
                return _this.environment.update(doc._id, { $set: doc }, { upsert: true }).then(function () { return Bluebird.resolve(res._id); });
            }
            return _this.environment.insert(doc);
        });
    };
    Database.prototype.cleanEnvironments = function (projectName) {
        return this.environment.remove({ project: projectName });
    };
    Database.prototype.cleanEnvironment = function (hash) {
        return this.environment.remove({ _id: hash });
    };
    Database.prototype.insertReport = function (report) {
        return this.error.insert(report);
    };
    Database.prototype.getReports = function () {
        return this.error.find();
    };
    Database.prototype.reset = function () {
    };
    return Database;
}());
exports.Database = Database;
