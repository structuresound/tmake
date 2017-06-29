module.exports =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// identity function for calling harmony imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "/";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 58);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports) {

module.exports = require("react");

/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var typed_json_transform_1 = __webpack_require__(25);
var publicKeys = { MONGO_URL: 'mongo.uri', PORT: 'server.port' };
var privateKeys = {
    CREATESEND_KEY: 'createSend.key'
};
var settings = {};
exports.settings = settings;
function initialize(_settings, isServer) {
    typed_json_transform_1.extend(settings, _settings);
    if (isServer) {
        settings.env.isClient = false;
        settings.env.isServer = true;
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
            for (var _iterator = Object.keys(publicKeys)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                var key = _step.value;

                if (process.env[key]) {
                    typed_json_transform_1.setValueForKeyPath(process.env[key], publicKeys[key], settings);
                }
            }
        } catch (err) {
            _didIteratorError = true;
            _iteratorError = err;
        } finally {
            try {
                if (!_iteratorNormalCompletion && _iterator.return) {
                    _iterator.return();
                }
            } finally {
                if (_didIteratorError) {
                    throw _iteratorError;
                }
            }
        }

        var _iteratorNormalCompletion2 = true;
        var _didIteratorError2 = false;
        var _iteratorError2 = undefined;

        try {
            for (var _iterator2 = Object.keys(privateKeys)[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                var _key = _step2.value;

                if (process.env[_key]) {
                    typed_json_transform_1.setValueForKeyPath(process.env[_key], "private." + privateKeys[_key], settings);
                }
            }
        } catch (err) {
            _didIteratorError2 = true;
            _iteratorError2 = err;
        } finally {
            try {
                if (!_iteratorNormalCompletion2 && _iterator2.return) {
                    _iterator2.return();
                }
            } finally {
                if (_didIteratorError2) {
                    throw _iteratorError2;
                }
            }
        }
    }
    return settings;
}
exports.initialize = initialize;
;

var _temp = function () {
    if (typeof __REACT_HOT_LOADER__ === 'undefined') {
        return;
    }

    __REACT_HOT_LOADER__.register(publicKeys, "publicKeys", "/Users/leif/chroma/fund/front/src/lib/settings.ts");

    __REACT_HOT_LOADER__.register(privateKeys, "privateKeys", "/Users/leif/chroma/fund/front/src/lib/settings.ts");

    __REACT_HOT_LOADER__.register(settings, "settings", "/Users/leif/chroma/fund/front/src/lib/settings.ts");

    __REACT_HOT_LOADER__.register(initialize, "initialize", "/Users/leif/chroma/fund/front/src/lib/settings.ts");
}();

;

/***/ }),
/* 2 */
/***/ (function(module, exports) {

module.exports = require("react-bootstrap");

/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var React = __webpack_require__(0);
var react_bootstrap_1 = __webpack_require__(2);
var navbar_1 = __webpack_require__(50);
var footer_1 = __webpack_require__(49);
function Default(props) {
    return React.createElement("div", null, React.createElement(navbar_1.Navbar, Object.assign({}, props)), React.createElement("div", { id: "default-layout" }, React.createElement(react_bootstrap_1.Grid, { fluid: props.fluid }, React.createElement(react_bootstrap_1.Row, null, React.createElement(react_bootstrap_1.Col, { xs: 12, md: 1 }), React.createElement(react_bootstrap_1.Col, { xs: 12, md: 10 }, props.children)))), React.createElement(footer_1.Footer, Object.assign({}, props)));
}
exports.Default = Default;
function Fullscreen(props) {
    return React.createElement("div", null, React.createElement(navbar_1.Navbar, Object.assign({}, props)), React.createElement("div", { id: "fullscreen-layout" }, props.children), React.createElement(footer_1.Footer, Object.assign({}, props)));
}
exports.Fullscreen = Fullscreen;
;

var _temp = function () {
    if (typeof __REACT_HOT_LOADER__ === 'undefined') {
        return;
    }

    __REACT_HOT_LOADER__.register(Default, "Default", "/Users/leif/chroma/fund/front/src/ux/layouts/layout.tsx");

    __REACT_HOT_LOADER__.register(Fullscreen, "Fullscreen", "/Users/leif/chroma/fund/front/src/ux/layouts/layout.tsx");
}();

;

/***/ }),
/* 4 */
/***/ (function(module, exports) {

module.exports = require("react-router");

/***/ }),
/* 5 */
/***/ (function(module, exports) {

module.exports = require("express");

/***/ }),
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var settings_1 = __webpack_require__(1);
function s3domain(region) {
    if (region == 'us-west-2') {
        return "s3-" + region + ".amazonaws.com";
    }
    return 's3.amazonaws.com';
}
exports.s3domain = s3domain;
function imageUrl(relative) {
    var aws = settings_1.settings.aws;

    if (aws.s3cache) {
        return "https://" + aws.s3cache + "/" + relative;
    } else {
        return "https://" + aws.BUCKET_NAME + "." + s3domain(aws.region) + "/" + relative;
    }
}
exports.imageUrl = imageUrl;
;
function assetUrl(relative) {
    var aws = settings_1.settings.aws;

    if (aws.cdn) {
        return "https://" + aws.s3cache + "/" + relative;
    } else {
        return relative;
    }
}
exports.assetUrl = assetUrl;
;
function s3url(relative) {
    return imageUrl("static/" + relative);
}
exports.s3url = s3url;
;
;

var _temp = function () {
    if (typeof __REACT_HOT_LOADER__ === 'undefined') {
        return;
    }

    __REACT_HOT_LOADER__.register(s3domain, "s3domain", "/Users/leif/chroma/fund/front/src/lib/assets.ts");

    __REACT_HOT_LOADER__.register(imageUrl, "imageUrl", "/Users/leif/chroma/fund/front/src/lib/assets.ts");

    __REACT_HOT_LOADER__.register(assetUrl, "assetUrl", "/Users/leif/chroma/fund/front/src/lib/assets.ts");

    __REACT_HOT_LOADER__.register(s3url, "s3url", "/Users/leif/chroma/fund/front/src/lib/assets.ts");
}();

;

/***/ }),
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var fetch = __webpack_require__(11);
var settings_1 = __webpack_require__(1);
function get(_ref) {
    var url = _ref.url,
        body = _ref.body,
        mode = _ref.mode,
        auth = _ref.auth;

    var headers = new Headers();
    headers.append('Accept', 'application/json');
    headers.append('Content-Type', 'application/json');
    headers.append('User-Agent', 'https://chroma.fund/v' + settings_1.settings.version);
    if (auth) {
        var encoded = 'Basic ' + new Buffer(auth.user + ":" + (auth.password || 'x')).toString('base64');
        headers.append('Authorization', encoded);
    }
    return fetch(url, {
        method: 'GET',
        headers: headers,
        mode: mode || 'cors',
        cache: 'default'
    });
}
exports.get = get;
function post(_ref2) {
    var url = _ref2.url,
        body = _ref2.body,
        mode = _ref2.mode,
        auth = _ref2.auth;

    var headers = new Headers();
    headers.append('Accept', 'application/json');
    headers.append('Content-Type', 'application/json');
    headers.append('User-Agent', 'https://chroma.fund/v' + settings_1.settings.version);
    if (auth) {
        var encoded = 'Basic ' + new Buffer(auth.user + ":" + (auth.password || 'x')).toString('base64');
        headers.append('Authorization', encoded);
    }
    return fetch(url, {
        method: 'POST',
        headers: headers,
        mode: mode || 'cors',
        cache: 'default',
        body: JSON.stringify(body)
    });
}
exports.post = post;
;

var _temp = function () {
    if (typeof __REACT_HOT_LOADER__ === 'undefined') {
        return;
    }

    __REACT_HOT_LOADER__.register(get, "get", "/Users/leif/chroma/fund/front/src/lib/fetch.ts");

    __REACT_HOT_LOADER__.register(post, "post", "/Users/leif/chroma/fund/front/src/lib/fetch.ts");
}();

;

/***/ }),
/* 8 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var purple = 'rgb(184, 0,   142)';
var magenta = 'rgb(255, 0,   133)';
var red = 'rgb(250, 0,   33)';
var orange = 'rgb(255, 185, 0)';
var yellow = 'rgb(252, 249, 0)';
var green = 'rgb(181, 224, 34)';
var turquoise = 'rgb(0,   176, 188)';
var cyan = 'rgb(0,   173, 243)';
var blue = 'rgb(0,   128, 201)';
var colors = {
    purple: purple, magenta: magenta, red: red, orange: orange, yellow: yellow,
    green: green, turquoise: turquoise, cyan: cyan, blue: blue
};
exports.colors = colors;
var gradients = {
    rainbow: 'linear-gradient(to right, ' + purple + ', ' + blue + ', ' + turquoise + ', ' + cyan + ', ' + green + ', ' + yellow + ', ' + orange + ', ' + red + ', ' + magenta + ')'
};
exports.gradients = gradients;
var layout = { navbar: { height: '80px' } };
exports.layout = layout;
var aligner = {
    fullscreen: {
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    withHeight: function withHeight(height) {
        return {
            height: height,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        };
    },
    upperTwoThirds: {
        height: '66%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    form: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
    item: { maxWidth: '100%' },
    itemTop: { alignSelf: 'flex-start' },
    itemBottom: { alignSelf: 'flex-end' }
};
exports.aligner = aligner;
;

var _temp = function () {
    if (typeof __REACT_HOT_LOADER__ === 'undefined') {
        return;
    }

    __REACT_HOT_LOADER__.register(purple, 'purple', '/Users/leif/chroma/fund/front/src/styles/global.ts');

    __REACT_HOT_LOADER__.register(magenta, 'magenta', '/Users/leif/chroma/fund/front/src/styles/global.ts');

    __REACT_HOT_LOADER__.register(red, 'red', '/Users/leif/chroma/fund/front/src/styles/global.ts');

    __REACT_HOT_LOADER__.register(orange, 'orange', '/Users/leif/chroma/fund/front/src/styles/global.ts');

    __REACT_HOT_LOADER__.register(yellow, 'yellow', '/Users/leif/chroma/fund/front/src/styles/global.ts');

    __REACT_HOT_LOADER__.register(green, 'green', '/Users/leif/chroma/fund/front/src/styles/global.ts');

    __REACT_HOT_LOADER__.register(turquoise, 'turquoise', '/Users/leif/chroma/fund/front/src/styles/global.ts');

    __REACT_HOT_LOADER__.register(cyan, 'cyan', '/Users/leif/chroma/fund/front/src/styles/global.ts');

    __REACT_HOT_LOADER__.register(blue, 'blue', '/Users/leif/chroma/fund/front/src/styles/global.ts');

    __REACT_HOT_LOADER__.register(colors, 'colors', '/Users/leif/chroma/fund/front/src/styles/global.ts');

    __REACT_HOT_LOADER__.register(gradients, 'gradients', '/Users/leif/chroma/fund/front/src/styles/global.ts');

    __REACT_HOT_LOADER__.register(layout, 'layout', '/Users/leif/chroma/fund/front/src/styles/global.ts');

    __REACT_HOT_LOADER__.register(aligner, 'aligner', '/Users/leif/chroma/fund/front/src/styles/global.ts');
}();

;

/***/ }),
/* 9 */
/***/ (function(module, exports) {

module.exports = require("path");

/***/ }),
/* 10 */
/***/ (function(module, exports) {

module.exports = require("redux-form");

/***/ }),
/* 11 */
/***/ (function(module, exports) {

module.exports = require("isomorphic-fetch");

/***/ }),
/* 12 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Document = function Document() {
    _classCallCheck(this, Document);
};

exports.Document = Document;
var regex_1 = __webpack_require__(13);
exports.validate = function (doc) {
    var errors = {};
    if (!regex_1.default.fullName.test(doc.name)) {
        errors.name = 'First + Last Required';
    } else if (doc.name.length > 32) {
        errors.name = 'Must be 32 characters or less';
    }
    if (!doc.email) {
        errors.email = 'Required';
    } else if (!regex_1.default.email.test(doc.email)) {
        errors.email = 'Invalid email address';
    }
    if (!doc.body) {
        errors.body = 'Required';
    }
    return Object.keys(errors).length ? errors : undefined;
};
exports.warn = function (values) {
    var warnings = {};
    if (values.email && values.email.indexOf('.con') != -1) {
        warnings.email = 'whoops, check your .com address';
    }
    return warnings;
};
;

var _temp = function () {
    if (typeof __REACT_HOT_LOADER__ === 'undefined') {
        return;
    }

    __REACT_HOT_LOADER__.register(Document, "Document", "/Users/leif/chroma/fund/front/src/schema/contactForm.ts");
}();

;

/***/ }),
/* 13 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var regex = {
    fullName: /^([a-zA-Z]{2,}\s[a-zA-z]{1,}'?-?[a-zA-Z]{2,}\s?([a-zA-Z]{1,})?)/,
    email: /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
    url: /^(?:(?:https?|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?!10(?:\.\d{1,3}){3})(?!127(?:\.\d{1,3}){3})(?!169\.254(?:\.\d{1,3}){2})(?!192\.168(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/i,
    mongoId: /^[23456789ABCDEFGHJKLMNPQRSTWXYZabcdefghijkmnopqrstuvwxyz]{17}$/,
    zipCome: /^\d{5}(?:[-\s]\d{4})?$/,
    phone: /^[0-9０-９٠-٩۰-۹]{2}$|^[+＋]*(?:[-x‐-―−ー－-／  ­​⁠　()（）［］.\[\]/~⁓∼～*]*[0-9０-９٠-٩۰-۹]){3,}[-x‐-―−ー－-／  ­​⁠　()（）［］.\[\]/~⁓∼～0-9０-９٠-٩۰-۹]*(?:;ext=([0-9０-９٠-٩۰-۹]{1,7})|[  \t,]*(?:e?xt(?:ensi(?:ó?|ó))?n?|ｅ?ｘｔｎ?|[,xｘ#＃~～]|int|anexo|ｉｎｔ)[:\.．]?[  \t,-]*([0-9０-９٠-٩۰-۹]{1,7})#?|[- ]+([0-9０-９٠-٩۰-۹]{1,5})#)?$/i,
    pubkey: /^[13n][1-9A-Za-z][^OIl]{20,40}/,
    privkey: /^[5KL][1-9A-HJ-NP-Za-km-z]{50,51}$/
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = regex;
;

var _temp = function () {
    if (typeof __REACT_HOT_LOADER__ === 'undefined') {
        return;
    }

    __REACT_HOT_LOADER__.register(regex, "regex", "/Users/leif/chroma/fund/front/src/schema/regex.ts");
}();

;

/***/ }),
/* 14 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Document = function Document() {
    _classCallCheck(this, Document);
};

exports.Document = Document;
var regex_1 = __webpack_require__(13);
exports.validate = function (doc) {
    var errors = {};
    if (!regex_1.default.fullName.test(doc.name)) {
        errors.name = 'First + Last Required';
    } else if (doc.name.length > 32) {
        errors.name = 'Must be 32 characters or less';
    }
    if (!doc.email) {
        errors.email = 'Required';
    } else if (!regex_1.default.email.test(doc.email)) {
        errors.email = 'Invalid email address';
    }
    return Object.keys(errors).length ? errors : undefined;
};
exports.warn = function (values) {
    var warnings = {};
    if (values.email && values.email.indexOf('.con') != -1) {
        warnings.email = 'whoops, check your .com address';
    }
    return Object.keys(warnings).length ? warnings : undefined;
};
;

var _temp = function () {
    if (typeof __REACT_HOT_LOADER__ === 'undefined') {
        return;
    }

    __REACT_HOT_LOADER__.register(Document, "Document", "/Users/leif/chroma/fund/front/src/schema/subscribeForm.ts");
}();

;

/***/ }),
/* 15 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var fetch_1 = __webpack_require__(7);
var settings_1 = __webpack_require__(1);
var apiRoot = 'https://api.createsend.com/api/v3.1';
function subscribe(id, form) {
    var url = apiRoot + "/subscribers/" + id + ".json";
    var body = {
        "EmailAddress": form.email,
        "Name": form.name,
        "CustomFields": [{
            "Key": "origin",
            "Value": settings_1.settings.env.absoluteUrl
        }],
        "Resubscribe": true,
        "RestartSubscriptionBasedAutoresponders": true
    };
    return fetch_1.post({ url: url, body: body, auth: { user: settings_1.settings.private.createSend.key } }).then(function (res) {
        if (res.status > 200 && res.status < 300) {
            return Promise.resolve(res);
        } else {
            return Promise.reject(new Error(res.statusText));
        }
    });
}
exports.subscribe = subscribe;
function integrate() {
    var listId = 'b68fa123aa331d83e894e7457e1abaef';
    var url = apiRoot + "/subscribers/" + listId + ".json";
    var body = {
        "EmailAddress": 'integrate@chroma.fund',
        "Name": 'Integration Test',
        "CustomFields": [{
            "Key": "origin",
            "Value": settings_1.settings.env.absoluteUrl
        }],
        "Resubscribe": true,
        "RestartSubscriptionBasedAutoresponders": true
    };
    return fetch_1.post({ url: url, body: body, auth: { user: settings_1.settings.private.createSend.key } }).then(function (res) {
        if (res.status > 200 && res.status < 300) {
            return Promise.resolve(res);
        } else {
            throw new Error("failed integration test on error " + res.statusText);
        }
    });
}
exports.integrate = integrate;
;

var _temp = function () {
    if (typeof __REACT_HOT_LOADER__ === 'undefined') {
        return;
    }

    __REACT_HOT_LOADER__.register(apiRoot, "apiRoot", "/Users/leif/chroma/fund/front/src/server/lib/createSend.ts");

    __REACT_HOT_LOADER__.register(subscribe, "subscribe", "/Users/leif/chroma/fund/front/src/server/lib/createSend.ts");

    __REACT_HOT_LOADER__.register(integrate, "integrate", "/Users/leif/chroma/fund/front/src/server/lib/createSend.ts");
}();

;

/***/ }),
/* 16 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var amqp_1 = __webpack_require__(35);
var settings_1 = __webpack_require__(1);
var mailQueue = settings_1.settings.private.amqp.queues.mail;
function send(doc) {
    return amqp_1.postToQueue(mailQueue, JSON.stringify(doc));
}
exports.send = send;
function integrate() {
    var email = {
        from: settings_1.settings.email.contact,
        to: 'dev@chroma.io',
        replyTo: 'dev@chroma.io',
        subject: "new contact: Integration test",
        html: '<p> passing test! </p>',
        generateTextFromHTML: true
    };
    return amqp_1.postToQueue(mailQueue, JSON.stringify(email));
}
exports.integrate = integrate;
;

var _temp = function () {
    if (typeof __REACT_HOT_LOADER__ === 'undefined') {
        return;
    }

    __REACT_HOT_LOADER__.register(mailQueue, "mailQueue", "/Users/leif/chroma/fund/front/src/server/lib/email.ts");

    __REACT_HOT_LOADER__.register(send, "send", "/Users/leif/chroma/fund/front/src/server/lib/email.ts");

    __REACT_HOT_LOADER__.register(integrate, "integrate", "/Users/leif/chroma/fund/front/src/server/lib/email.ts");
}();

;

/***/ }),
/* 17 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var React = __webpack_require__(0);
var react_bootstrap_1 = __webpack_require__(2);
var global_1 = __webpack_require__(8);

var FormField = function (_React$Component) {
    _inherits(FormField, _React$Component);

    function FormField() {
        _classCallCheck(this, FormField);

        return _possibleConstructorReturn(this, (FormField.__proto__ || Object.getPrototypeOf(FormField)).apply(this, arguments));
    }

    _createClass(FormField, [{
        key: "getState",
        value: function getState(meta) {
            if (meta.dirty) {
                if (meta.error) {
                    return 'error';
                }
                if (meta.warning) {
                    return 'warning';
                }
                return 'success';
            }
            return null;
        }
    }, {
        key: "render",
        value: function render() {
            var _props = this.props,
                placeholder = _props.placeholder,
                type = _props.type,
                input = _props.input,
                meta = _props.meta,
                children = _props.children;

            return React.createElement(react_bootstrap_1.FormGroup, { controlId: input.name, validationState: this.getState(meta) }, React.createElement(react_bootstrap_1.ControlLabel, null, children), React.createElement(react_bootstrap_1.FormControl, { type: type, placeholder: placeholder, value: input.value, onChange: input.onChange }), React.createElement(react_bootstrap_1.FormControl.Feedback, { style: global_1.aligner.form }), React.createElement(react_bootstrap_1.HelpBlock, null, meta.error || meta.warning || ''));
        }
    }]);

    return FormField;
}(React.Component);

exports.FormField = FormField;
;

var _temp = function () {
    if (typeof __REACT_HOT_LOADER__ === 'undefined') {
        return;
    }

    __REACT_HOT_LOADER__.register(FormField, "FormField", "/Users/leif/chroma/fund/front/src/ux/forms/formField.tsx");
}();

;

/***/ }),
/* 18 */
/***/ (function(module, exports) {

module.exports = require("body-parser");

/***/ }),
/* 19 */
/***/ (function(module, exports) {

module.exports = require("fs");

/***/ }),
/* 20 */
/***/ (function(module, exports) {

module.exports = require("react-helmet");

/***/ }),
/* 21 */
/***/ (function(module, exports) {

module.exports = require("react-redux");

/***/ }),
/* 22 */
/***/ (function(module, exports) {

module.exports = require("react-responsive");

/***/ }),
/* 23 */
/***/ (function(module, exports) {

module.exports = require("react-router-redux");

/***/ }),
/* 24 */
/***/ (function(module, exports) {

module.exports = require("redux");

/***/ }),
/* 25 */
/***/ (function(module, exports) {

module.exports = require("typed-json-transform");

/***/ }),
/* 26 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var express = __webpack_require__(5);
var cors = __webpack_require__(65);
var path = __webpack_require__(9);
var methodOverride = __webpack_require__(70);
var gzip = __webpack_require__(64);
var helmet = __webpack_require__(67);
var httpProxy = __webpack_require__(68);
var settings_1 = __webpack_require__(1);
var assets_1 = __webpack_require__(6);
function init(app) {
    app.set('port', settings_1.settings.private.express.port);
    if (settings_1.settings.env.production) {
        app.use(gzip());
    }
    ;
    app.use(cors({
        "origin": "*",
        "methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
        "preflightContinue": false
    }));
    var bucket = "https://" + settings_1.settings.aws.BUCKET_NAME + "." + assets_1.s3domain(settings_1.settings.aws.region);
    var cspDirectives = {
        defaultSrc: ["'self'", settings_1.settings.env.absoluteUrl, 'https://chroma-fund.s3.amazonaws.com', bucket],
        styleSrc: ["'self' 'unsafe-inline'", 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'],
        fontSrc: ["'self'", 'data:', 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'],
        scriptSrc: ["'self' 'unsafe-inline'", 'https://www.google-analytics.com'],
        connectSrc: ["'self'", "https://kmikeym.createsend.com/"],
        imgSrc: ["'self'", 'data:', bucket, 'https://www.google-analytics.com']
    };
    if (settings_1.settings.env.production) {
        cspDirectives.connectSrc.push(settings_1.settings.env.absoluteUrl);
    } else {
        cspDirectives.connectSrc.push("wss://localhost.chroma.fund");
    }
    app.use(helmet());
    app.use(helmet.contentSecurityPolicy({
        directives: cspDirectives
    }));
    if (settings_1.settings.env.production) {
        var bundleDir = path.join(process.cwd(), 'front');
        app.use('/front', express.static(bundleDir, { fallthrough: true }));
        console.log("===>  Serving client bundle from " + bundleDir);
    } else {
        var bundleServer = "http://localhost:3001/";
        var proxy = httpProxy.createProxyServer({ target: bundleServer, ws: true });
        app.use('/front', function (req, res) {
            proxy.web(req, res, { https: false, target: bundleServer });
        });
    }
    app.use(methodOverride());
    app.use(__webpack_require__(66).capture());
    console.log("--------------------------\n===> \uD83D\uDE0A  Starting Server . . .\n===>  Environment: " + JSON.stringify(settings_1.settings.env) + "\n===>  Listening on port: " + app.get('port'));
    if (settings_1.settings.env.production) {
        console.log('===> 🚦  Note: In order for authentication to work in production');
        console.log('===>           you will need a secure HTTPS connection');
    }
    console.log('--------------------------');
}
exports.init = init;
;
;

var _temp = function () {
    if (typeof __REACT_HOT_LOADER__ === 'undefined') {
        return;
    }

    __REACT_HOT_LOADER__.register(init, "init", "/Users/leif/chroma/fund/front/src/server/express/index.ts");
}();

;

/***/ }),
/* 27 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var createSend_1 = __webpack_require__(15);
var email_1 = __webpack_require__(16);
function integrate() {
    var start = new Date();
    createSend_1.integrate().then(email_1.integrate).then(function () {
        var end = new Date();
        console.log("all integration tests passed in " + (end.valueOf() - start.valueOf()) + " ms");
    });
}
exports.integrate = integrate;
;

var _temp = function () {
    if (typeof __REACT_HOT_LOADER__ === 'undefined') {
        return;
    }

    __REACT_HOT_LOADER__.register(integrate, "integrate", "/Users/leif/chroma/fund/front/src/server/integrate.ts");
}();

;

/***/ }),
/* 28 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var react_router_1 = __webpack_require__(4);
var routes_1 = __webpack_require__(57);
var store_1 = __webpack_require__(32);
var types = __webpack_require__(33);
var pageRenderer_1 = __webpack_require__(38);
var fetchDataForRoute_1 = __webpack_require__(31);
var ssr_1 = __webpack_require__(39);
function render(req, res) {
    var history = react_router_1.createMemoryHistory();
    var store = store_1.default({}, history);
    var routes = routes_1.default(store);
    react_router_1.match({ routes: routes, location: req.url }, function (err, redirect, props) {
        if (err) {
            res.status(500).json(err);
        } else if (redirect) {
            res.redirect(302, redirect.pathname + redirect.search);
        } else if (props) {
            store.dispatch({ type: types.CREATE_REQUEST });
            fetchDataForRoute_1.default(props).then(function (data) {
                store.dispatch({ type: types.REQUEST_SUCCESS, data: data });
                res.status(200).send(pageRenderer_1.renderPage(store, props, ssr_1.mq(req)));
            }).catch(function (err) {
                res.status(500).json(err);
            });
        } else {
            res.sendStatus(404);
        }
    });
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = render;
;

var _temp = function () {
    if (typeof __REACT_HOT_LOADER__ === 'undefined') {
        return;
    }

    __REACT_HOT_LOADER__.register(render, "render", "/Users/leif/chroma/fund/front/src/server/render/middleware.ts");
}();

;

/***/ }),
/* 29 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var subscribe_1 = __webpack_require__(41);
var contact_1 = __webpack_require__(40);
function init(app) {
    app.use('/api/v1/subscribe', subscribe_1.routes);
    app.use('/api/v1/contact', contact_1.routes);
}
exports.init = init;
;
;

var _temp = function () {
    if (typeof __REACT_HOT_LOADER__ === 'undefined') {
        return;
    }

    __REACT_HOT_LOADER__.register(init, "init", "/Users/leif/chroma/fund/front/src/server/routes/index.ts");
}();

;

/***/ }),
/* 30 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var yaml = __webpack_require__(69);
var path = __webpack_require__(9);
var fs_1 = __webpack_require__(19);
var settings_1 = __webpack_require__(1);
var fetch_1 = __webpack_require__(7);
var settings = void 0;
if (process.env.SETTINGS) {
    try {
        settings = yaml.load(process.env.SETTINGS);
        console.log("loaded settings from env.SETTINGS");
    } catch (error) {
        console.log("error reading settings string " + process.env.SETTINGS, error);
    }
} else {
    var settingsPath = path.join(process.cwd(), process.env['SETTINGS_PATH'] || './settings.yaml');
    settings = yaml.load(fs_1.readFileSync(settingsPath, 'utf8'));
    console.log("loaded settings @ " + settingsPath);
}
settings.version = JSON.parse(fs_1.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8')).version;
if (settings.env) {
    throw new Error("don't provide env to SETTINGS or settings.yaml, it should be computed at launch");
}
var transport = settings.private.express.https ? 'https' : 'http';
settings.env = {
    production: process.env.NODE_ENV === "production" ? true : false,
    debug: process.env.NODE_ENV === "production" ? false : true,
    absoluteUrl: transport + "://" + settings.private.express.domain
};
if (!settings.ssr) {
    settings.ssr = {};
}
if (!settings.webpack) {
    settings.webpack = {};
}
if (!settings.manifest) {
    settings.manifest = { active: { theme: 'dark' } };
}
if (!settings.manifest.bundle) settings.manifest.bundle = {};
var themeUrl = void 0;
if (process.env.NODE_ENV === "production") {
    settings.private.express.https = true;
    var bundleManifest = JSON.parse(fs_1.readFileSync(process.cwd() + "/front/bundle.json", 'utf8'));
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
        for (var _iterator = Object.keys(bundleManifest)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var k = _step.value;

            settings.manifest.bundle[k] = '/front/' + bundleManifest[k];
        }
    } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion && _iterator.return) {
                _iterator.return();
            }
        } finally {
            if (_didIteratorError) {
                throw _iteratorError;
            }
        }
    }

    themeUrl = 'http://theme/theme/theme.json';
} else {
    settings.manifest.bundle['bundle.js'] = '/front/bundle.js';
    settings.manifest.bundle['bundle.css'] = '/front/bundle.css';
    themeUrl = 'http://localhost:3002/theme.json';
}
if (!settings.manifest.theme) settings.manifest.theme = {};
var runtimeSettings = settings_1.initialize(settings, true);
function fetchTheme() {
    fetch_1.get({ url: themeUrl }).then(function (res) {
        if (res.status >= 200 && res.status < 300) {
            res.json().then(function (bundleManifest) {
                var _iteratorNormalCompletion2 = true;
                var _didIteratorError2 = false;
                var _iteratorError2 = undefined;

                try {
                    for (var _iterator2 = Object.keys(bundleManifest)[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                        var _k = _step2.value;

                        runtimeSettings.manifest.theme[_k] = '/theme/' + bundleManifest[_k];
                    }
                } catch (err) {
                    _didIteratorError2 = true;
                    _iteratorError2 = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion2 && _iterator2.return) {
                            _iterator2.return();
                        }
                    } finally {
                        if (_didIteratorError2) {
                            throw _iteratorError2;
                        }
                    }
                }

                runtimeSettings.manifest.theme.cssBundle = '/theme/' + bundleManifest[settings.manifest.active.theme + '.css'];
            });
        }
    }, function (error) {
        console.log('fetched failed', error.message);
    });
}
fetchTheme();
setInterval(fetchTheme, 5000);
;

var _temp = function () {
    if (typeof __REACT_HOT_LOADER__ === 'undefined') {
        return;
    }

    __REACT_HOT_LOADER__.register(settings, "settings", "/Users/leif/chroma/fund/front/src/server/settings.ts");

    __REACT_HOT_LOADER__.register(transport, "transport", "/Users/leif/chroma/fund/front/src/server/settings.ts");

    __REACT_HOT_LOADER__.register(themeUrl, "themeUrl", "/Users/leif/chroma/fund/front/src/server/settings.ts");

    __REACT_HOT_LOADER__.register(runtimeSettings, "runtimeSettings", "/Users/leif/chroma/fund/front/src/server/settings.ts");

    __REACT_HOT_LOADER__.register(fetchTheme, "fetchTheme", "/Users/leif/chroma/fund/front/src/server/settings.ts");
}();

;

/***/ }),
/* 31 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var defaultFetchData = function defaultFetchData() {
    return Promise.resolve();
};
function fetchDataForRoute(_ref) {
    var routes = _ref.routes,
        params = _ref.params;

    var matchedRoute = routes[routes.length - 1];
    var fetchDataHandler = matchedRoute.fetchData || defaultFetchData;
    return fetchDataHandler(params);
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = fetchDataForRoute;
;

var _temp = function () {
    if (typeof __REACT_HOT_LOADER__ === 'undefined') {
        return;
    }

    __REACT_HOT_LOADER__.register(defaultFetchData, "defaultFetchData", "/Users/leif/chroma/fund/front/src/lib/fetchDataForRoute.ts");

    __REACT_HOT_LOADER__.register(fetchDataForRoute, "fetchDataForRoute", "/Users/leif/chroma/fund/front/src/lib/fetchDataForRoute.ts");
}();

;

/***/ }),
/* 32 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var redux_1 = __webpack_require__(24);
var react_router_redux_1 = __webpack_require__(23);
var redux_thunk_1 = __webpack_require__(73);
var settings_1 = __webpack_require__(1);
var index_1 = __webpack_require__(34);
function createStore(initialState, history) {
    var middleware = [redux_thunk_1.default, react_router_redux_1.routerMiddleware(history)];
    var store = void 0;
    if (settings_1.settings.env.isClient && settings_1.settings.env.debug) {
        var createLogger = __webpack_require__(72);
        middleware.push(createLogger());
        var enhancer = redux_1.compose(redux_1.applyMiddleware.apply(redux_1, middleware), window.devToolsExtension ? window.devToolsExtension() : function (f) {
            return f;
        });
        store = redux_1.createStore(index_1.default, initialState, enhancer);
    } else {
        var _enhancer = redux_1.compose(redux_1.applyMiddleware.apply(redux_1, middleware), function (f) {
            return f;
        });
        store = redux_1.createStore(index_1.default, initialState, _enhancer);
    }
    if (false) {
        module.hot.accept('../reducers', function () {
            var nextReducer = require('../reducers');
            store.replaceReducer(nextReducer);
        });
    }
    return store;
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = createStore;
;

var _temp = function () {
    if (typeof __REACT_HOT_LOADER__ === 'undefined') {
        return;
    }

    __REACT_HOT_LOADER__.register(createStore, "createStore", "/Users/leif/chroma/fund/front/src/lib/store.ts");
}();

;

/***/ }),
/* 33 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.DISMISS_MESSAGE = 'DISMISS_MESSAGE';
exports.CREATE_REQUEST = 'CREATE_REQUEST';
exports.REQUEST_SUCCESS = 'REQUEST_SUCCESS';
exports.REQUEST_FAILURE = 'REQUEST_FAILURE';
;

var _temp = function () {
  if (typeof __REACT_HOT_LOADER__ === 'undefined') {
    return;
  }
}();

;

/***/ }),
/* 34 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var redux_1 = __webpack_require__(24);
var react_router_redux_1 = __webpack_require__(23);
var redux_form_1 = __webpack_require__(10);
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = redux_1.combineReducers({ routing: react_router_redux_1.routerReducer, form: redux_form_1.reducer });
;

var _temp = function () {
  if (typeof __REACT_HOT_LOADER__ === 'undefined') {
    return;
  }
}();

;

/***/ }),
/* 35 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var amqplib_1 = __webpack_require__(62);
var settings_1 = __webpack_require__(1);
__webpack_require__(36);
var amqp = settings_1.settings.private.amqp;

var amqpUri = void 0;
if (amqp.username) {
    amqpUri = "amqp://" + amqp.username + ":" + amqp.password + "@" + amqp.host + ":" + amqp.port;
} else {
    amqpUri = "amqp://" + amqp.host + ":" + amqp.port;
}
var connection = void 0;
function init() {
    try {
        connection = amqplib_1.connect(amqpUri);
        console.log('connected to amqp');
        clearInterval(retry);
    } catch (e) {
        console.log('error connecting to rabbit, trying again');
    }
}
var retry = setInterval(init, 5000);
function postToQueue(q, data) {
    return connection.then(function (conn) {
        return conn.createChannel();
    }).then(function (ch) {
        var channel = ch;
        return channel.assertQueue(q).then(function (ok) {
            return channel.sendToQueue(q, new Buffer(data));
        });
    });
}
exports.postToQueue = postToQueue;
;

var _temp = function () {
    if (typeof __REACT_HOT_LOADER__ === 'undefined') {
        return;
    }

    __REACT_HOT_LOADER__.register(amqp, "amqp", "/Users/leif/chroma/fund/front/src/server/lib/amqp.ts");

    __REACT_HOT_LOADER__.register(amqpUri, "amqpUri", "/Users/leif/chroma/fund/front/src/server/lib/amqp.ts");

    __REACT_HOT_LOADER__.register(connection, "connection", "/Users/leif/chroma/fund/front/src/server/lib/amqp.ts");

    __REACT_HOT_LOADER__.register(init, "init", "/Users/leif/chroma/fund/front/src/server/lib/amqp.ts");

    __REACT_HOT_LOADER__.register(retry, "retry", "/Users/leif/chroma/fund/front/src/server/lib/amqp.ts");

    __REACT_HOT_LOADER__.register(postToQueue, "postToQueue", "/Users/leif/chroma/fund/front/src/server/lib/amqp.ts");
}();

;

/***/ }),
/* 36 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var Bluebird = __webpack_require__(63);
Bluebird.onPossiblyUnhandledRejection(function (e, promise) {
    console.log(e.message);
    console.log(e.stack);
});
;

var _temp = function () {
    if (typeof __REACT_HOT_LOADER__ === 'undefined') {
        return;
    }
}();

;

/***/ }),
/* 37 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var fs_1 = __webpack_require__(19);
var settings_1 = __webpack_require__(1);
function scriptBundles() {
    if (settings_1.settings.env.production) {
        var bundle = JSON.parse(fs_1.readFileSync(process.cwd() + "/front/bundle.json", 'utf8'));
        return "\n<script type=\"text/javascript\" charset= \"utf-8\" src= \"/front/" + bundle['bundle.js'] + "\"></script>\n";
    } else {
        return '<script type="text/javascript" charset="utf-8" src="/front/bundle.js"></script>';
    }
}
exports.scriptBundles = scriptBundles;
;
function createTrackingScript() {
    return settings_1.settings.google.analytics.id ? createAnalyticsSnippet(settings_1.settings.google.analytics.id) : '';
}
exports.createTrackingScript = createTrackingScript;
;
function createAnalyticsSnippet(id) {
    return "\n<script>\nwindow.ga=window.ga || function () { (ga.q = ga.q || []).push(arguments) }; ga.l = +new Date;\nga('create', '" + id + "', 'auto');\nga('send', 'pageview');\n</script>\n<script async src='https://www.google-analytics.com/analytics.js'></script>\n";
}
exports.createAnalyticsSnippet = createAnalyticsSnippet;
;

var _temp = function () {
    if (typeof __REACT_HOT_LOADER__ === 'undefined') {
        return;
    }

    __REACT_HOT_LOADER__.register(scriptBundles, "scriptBundles", "/Users/leif/chroma/fund/front/src/server/render/bundles.ts");

    __REACT_HOT_LOADER__.register(createTrackingScript, "createTrackingScript", "/Users/leif/chroma/fund/front/src/server/render/bundles.ts");

    __REACT_HOT_LOADER__.register(createAnalyticsSnippet, "createAnalyticsSnippet", "/Users/leif/chroma/fund/front/src/server/render/bundles.ts");
}();

;

/***/ }),
/* 38 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var React = __webpack_require__(0);
var server_1 = __webpack_require__(71);
var react_redux_1 = __webpack_require__(21);
var react_router_1 = __webpack_require__(4);
var Helmet = __webpack_require__(20);
var typed_json_transform_1 = __webpack_require__(25);
var bundles_1 = __webpack_require__(37);
var settings_1 = __webpack_require__(1);
var settings = typed_json_transform_1.clone(settings_1.settings);
delete settings.private;
settings.env.isClient = true;
settings.env.isServer = false;
function renderPage(store, props, mq) {
    settings.manifest = settings_1.settings.manifest;
    var initialState = store.getState();
    props.params.mq = mq;
    try {
        var componentHTML = server_1.renderToString(React.createElement(react_redux_1.Provider, { store: store }, React.createElement(react_router_1.RouterContext, Object.assign({}, props))));
        var headAssets = Helmet.rewind();
        return "\n    <!doctype html>\n    <html>\n      <head>\n        " + headAssets.title.toString() + "\n        " + headAssets.meta.toString() + "\n        " + headAssets.link.toString() + "\n        " + bundles_1.createTrackingScript() + "\n      </head>\n      <body>\n        <div id=\"app\"><div>" + componentHTML + "</div></div>\n        <script>window.__INITIAL_STATE__ = " + JSON.stringify(initialState) + "</script>\n        <script>window.__SETTINGS__ = " + JSON.stringify(settings) + "</script>\n        " + bundles_1.scriptBundles() + "\n      </body>\n    </html>";
    } catch (e) {
        console.log('error rendering html:', e);
        return "React - " + e.message;
    }
}
exports.renderPage = renderPage;
;
;

var _temp = function () {
    if (typeof __REACT_HOT_LOADER__ === 'undefined') {
        return;
    }

    __REACT_HOT_LOADER__.register(settings, "settings", "/Users/leif/chroma/fund/front/src/server/render/pageRenderer.tsx");

    __REACT_HOT_LOADER__.register(renderPage, "renderPage", "/Users/leif/chroma/fund/front/src/server/render/pageRenderer.tsx");
}();

;

/***/ }),
/* 39 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


function mq(req) {
    var mq = {
        width: 1280,
        height: 720,
        screen: true
    };
    switch (req.device.type) {
        case 'phone':
            mq.width = 320;
            mq.height = 640;
            break;
        case 'tablet':
            mq.width = 1280;
            break;
        case 'desktop':
            mq.width = 1280;
            break;
    }
    return mq;
}
exports.mq = mq;
;

var _temp = function () {
    if (typeof __REACT_HOT_LOADER__ === 'undefined') {
        return;
    }

    __REACT_HOT_LOADER__.register(mq, 'mq', '/Users/leif/chroma/fund/front/src/server/render/ssr.ts');
}();

;

/***/ }),
/* 40 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var express_1 = __webpack_require__(5);
var bodyParser = __webpack_require__(18);
var settings_1 = __webpack_require__(1);
var contactForm_1 = __webpack_require__(12);
var email_1 = __webpack_require__(16);

var Emailer = function () {
    function Emailer() {
        _classCallCheck(this, Emailer);

        this.router = express_1.Router();
        this.init();
    }

    _createClass(Emailer, [{
        key: "get",
        value: function get(req, res, next) {
            return res.status(409).send({
                message: 'POST only',
                status: res.status
            });
        }
    }, {
        key: "post",
        value: function post(request, response) {
            var form = request.body;
            var errors = contactForm_1.validate(form);
            if (errors) {
                console.log('errors', errors);
                return response.status(409).send({
                    message: JSON.stringify(errors),
                    status: response.status
                });
            } else {
                var email = {
                    from: settings_1.settings.email.contact,
                    to: settings_1.settings.email.support,
                    replyTo: form.email,
                    subject: "new contact: " + form.name,
                    template: 'contact',
                    data: form,
                    generateTextFromHTML: true
                };
                return email_1.send(email).then(function (res) {
                    return response.status(201).send({
                        message: 'success',
                        status: response.status,
                        subscribed: form.email
                    });
                });
            }
        }
    }, {
        key: "init",
        value: function init() {
            this.router.post('/', bodyParser.json(), this.post);
            this.router.get('/', this.get);
        }
    }]);

    return Emailer;
}();

exports.Emailer = Emailer;
var router = new Emailer();
router.init();
exports.routes = router.router;
;

var _temp = function () {
    if (typeof __REACT_HOT_LOADER__ === 'undefined') {
        return;
    }

    __REACT_HOT_LOADER__.register(Emailer, "Emailer", "/Users/leif/chroma/fund/front/src/server/routes/contact.ts");

    __REACT_HOT_LOADER__.register(router, "router", "/Users/leif/chroma/fund/front/src/server/routes/contact.ts");
}();

;

/***/ }),
/* 41 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var express_1 = __webpack_require__(5);
var subscribeForm_1 = __webpack_require__(14);
var bodyParser = __webpack_require__(18);
var createSend_1 = __webpack_require__(15);

var FormPoster = function () {
    function FormPoster() {
        _classCallCheck(this, FormPoster);

        this.router = express_1.Router();
        this.init();
    }

    _createClass(FormPoster, [{
        key: "get",
        value: function get(req, res, next) {
            return res.status(409).send({
                message: 'POST only',
                status: res.status
            });
        }
    }, {
        key: "post",
        value: function post(request, response) {
            var form = request.body;
            var errors = subscribeForm_1.validate(form);
            if (errors) {
                console.log('errors', errors);
                return response.status(409).send({
                    message: JSON.stringify(errors),
                    status: response.status
                });
            } else {
                var listId = 'b68fa123aa331d83e894e7457e1abaef';
                return createSend_1.subscribe(listId, form).then(function (res) {
                    return response.status(res.status).send({
                        message: 'success',
                        status: response.status,
                        subscribed: form.email
                    });
                }, function (error) {
                    return response.status(500).send({
                        message: 'We had an issue contacting campaign monitor',
                        status: response.status
                    });
                });
            }
        }
    }, {
        key: "init",
        value: function init() {
            this.router.post('/', bodyParser.json(), this.post);
            this.router.get('/', this.get);
        }
    }]);

    return FormPoster;
}();

exports.FormPoster = FormPoster;
var router = new FormPoster();
router.init();
exports.routes = router.router;
;

var _temp = function () {
    if (typeof __REACT_HOT_LOADER__ === 'undefined') {
        return;
    }

    __REACT_HOT_LOADER__.register(FormPoster, "FormPoster", "/Users/leif/chroma/fund/front/src/server/routes/subscribe.ts");

    __REACT_HOT_LOADER__.register(router, "router", "/Users/leif/chroma/fund/front/src/server/routes/subscribe.ts");
}();

;

/***/ }),
/* 42 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var React = __webpack_require__(0);
var Helmet = __webpack_require__(20);
var settings_1 = __webpack_require__(1);
function metaAssets() {
    return [{ charset: 'utf-8' }, { name: 'description', content: 'Your One-Stop solution for a full-stack universal Redux App' }, { 'http-equiv': 'X-UA-Compatible', content: 'IE=edge' }, { name: 'viewport', content: 'width=device-width, initial-scale=1' }, { name: 'msapplication-tap-highlight', content: 'no' }, { name: 'mobile-web-app-capable', content: 'yes' }, { name: 'apple-mobile-web-app-capable', content: 'yes' }, { name: 'apple-mobile-web-app-status-bar-style', content: 'black' }, { name: 'apple-mobile-web-app-title', content: 'reactGo' }, { name: 'msapplication-TileImage', content: settings_1.settings.manifest.theme['icon_120.png'] }, { name: 'msapplication-TileColor', content: '#3372DF' }];
}
;
function linkAssets() {
    var links = [{ rel: 'icon', href: settings_1.settings.manifest.theme['favicon.ico'] }, { rel: 'icon', sizes: '192x192', href: settings_1.settings.manifest.theme['icon_120.png'] }, { rel: 'apple-touch-icon', sizes: '152x152', href: settings_1.settings.manifest.theme['icon_120.png'] }, { rel: 'stylesheet', href: settings_1.settings.manifest.theme[settings_1.settings.manifest.active.theme + '.css'] }, { rel: 'stylesheet', href: settings_1.settings.manifest.bundle['bundle.css'] }, { 'rel': 'canonical', 'href': settings_1.settings.env.absoluteUrl }];
    return settings_1.settings.env.production ? links : links.filter(function (l) {
        return l.rel !== 'stylesheet';
    });
}
;

var Page = function (_React$Component) {
    _inherits(Page, _React$Component);

    function Page() {
        _classCallCheck(this, Page);

        return _possibleConstructorReturn(this, (Page.__proto__ || Object.getPrototypeOf(Page)).apply(this, arguments));
    }

    _createClass(Page, [{
        key: "render",
        value: function render() {
            var title = 'TMake.fund';
            var meta = metaAssets();
            var link = linkAssets();
            var children = this.props.children;

            return React.createElement("div", null, React.createElement(Helmet, { title: title, link: link, meta: meta }), this.props.children);
        }
    }]);

    return Page;
}(React.Component);

exports.Page = Page;
;

var _temp = function () {
    if (typeof __REACT_HOT_LOADER__ === 'undefined') {
        return;
    }

    __REACT_HOT_LOADER__.register(metaAssets, "metaAssets", "/Users/leif/chroma/fund/front/src/ux/containers/page.tsx");

    __REACT_HOT_LOADER__.register(linkAssets, "linkAssets", "/Users/leif/chroma/fund/front/src/ux/containers/page.tsx");

    __REACT_HOT_LOADER__.register(Page, "Page", "/Users/leif/chroma/fund/front/src/ux/containers/page.tsx");
}();

;

/***/ }),
/* 43 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var React = __webpack_require__(0);
var assets_1 = __webpack_require__(6);
var settings_1 = __webpack_require__(1);
function About() {
    var name = settings_1.settings.namespace.name;

    switch (name) {
        case 'aucanna':
            return React.createElement("div", null, React.createElement("p", null, "AuCanna.fund is dedicated to helping companies utilize SEC-approved crowdfunding methods to properly find investors and then empower and incentivize them to become the company\u2019s product evangelists in the market. \xA0Your company can raise up to $1 million per year from customers that can be used for product launches, geographic expansions, or any use that moves your business forward. We will support whatever you want to do, as long as you're committed to doing it right. \xA0 You have several options regarding the security you use -- sell shares (equity), borrow money (debt), or offer a royalty of future revenues by product, by geography, or for the whole company. \xA0While there are several options for raising funds, we recommend that cannabis companies use revenue royalty units. These securities have several advantages:  \u2022 you give participating investors a reason to promote your product and brand (they'll get paid their return faster as your revenue increases)  \u2022 it lets you pay your investors based on your success  \u2022 it keeps your cap table clean.\xA0 \xA0 AuCanna.fund is your platform for making offers to investors in compliance with Regulation CF. We work with you to file Form C, get your offering presented in our platform, and to encourage investors to participate. Through our network of trusted marketing specialists, you can build a professional and compelling presentation of your offering and you can plan a whole campaign after the investment to activate your investors as regular promoters of your product and brand. And we can facilitate the investor communications and payments you need to make once you've closed the offering.\xA0 \xA0 We're in it to help you succeed, using the most advanced investment options and technology to help you grow your business.\xA0"), React.createElement("p", null, "Team: William Kelly Bill is a seasoned entrepreneur in the technology and content spaces with deep experience in fundraising and investor relations. He was on the founding team of Sapient Health Network, which became WebMD, and was the founder and CEO of Learning.com, a pioneer in the online K12 education industry. "), React.createElement("p", null, "He has been active in the legal cannabis industry in Oregon, advising and investing in several promising startup companies. "), React.createElement("p", null, "He is an adjunct professor at Concordia University\u2019s MBA program where he teaches classes in marketing and entrepreneurial finance. He is a graduate of Harvard Business School."), React.createElement("p", null, "Ash Gupte Ash spent the first half of his career in finance at Intel, eventually helping start the Intel Capital investment fund. He then spent over 20 years in technology-based startups on founder teams and in C-level positions. Companies included The Palace, etrieve, Globe Tracker, and Select Sole."), React.createElement("p", null, "Since 2016 Ash has been co-founder and CEO of Nova Paths, a licensed processor and distributor of cannabis products in Oregon. "), React.createElement("p", null, "Ash received his MBA from the University of Pennsylvania Wharton School of Business"), React.createElement("p", null, "Beau Rudzek"), React.createElement("p", null, "Beau is a successful entrepreneur in technology and real estate ventures. He has been a real estate broker for Fairstone Properties since 2001. He founded Rudteck International, a web development and marketing agency. "), React.createElement("p", null, "Since 2016, Beau has been the co-founder and COO of Nova Paths, a licensed processor and distributor of cannabis products in Oregon."), React.createElement("p", null, "Beau studied Chemistry and Bioscience at Portland State University."));
        default:
            return React.createElement("div", null, React.createElement("p", null, "chroma.fund is a crowdfunding portal built for private funds and broker / dealers who want to take advantage of new crowdfunding regulations."), React.createElement("p", null, "As with traditional crowdfunding sites like Kickstarter, fund managers use TMake.fund to create campaigns (we call them \u201Cofferings\u201D) that explain the investment opportunity that they\u2019re attempting to raise money for. Unlike Kickstarter, people contributing money to these businesses are investing instead of donating. But TMake.fund is much more than \"Kickstarter for finance\" - you can think of it more like a small private market for investing in early stage companies and small businesses."), React.createElement("p", null, "TMake.fund facilitates compliance and allows for electronic signatures of investment agreements, which allows support for equity and debt based offerings. For debt-based offerings, businesses will use our software to make periodic payments directly into investor accounts."), React.createElement("p", null, "Private funds also have the ability to offer investors a diversified investment product, similar to an exchange traded fund (ETF)."), React.createElement("p", null, "Read our Frequently Asked Questions for more information on TMake.fund."), React.createElement("p", null, React.createElement("span", null, "The Team")), React.createElement("p", null, React.createElement("img", { className: "fit", src: assets_1.s3url('about/chroma-team.png'), style: { width: "100%" } })), React.createElement("p", { className: "text-center" }, "TMake.fund is (from left to right) Leif Shackelford, Marcus Estes, Adam Wong, and K. Mike Merrill"));
    }
}
exports.About = About;
;

var _temp = function () {
    if (typeof __REACT_HOT_LOADER__ === 'undefined') {
        return;
    }

    __REACT_HOT_LOADER__.register(About, "About", "/Users/leif/chroma/fund/front/src/ux/copy/about.tsx");
}();

;

/***/ }),
/* 44 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var React = __webpack_require__(0);
var settings_1 = __webpack_require__(1);
function Disclosures() {
    var name = settings_1.settings.namespace.name;

    switch (name) {
        case 'aucanna':
            return React.createElement("p", null, "PRIVACY POLICY Effective: May 16, 2016 This website privacy policy (\"Privacy Policy\") describes how AuCanna.fund, AuCanna Investment Solutions LLC, (\"AuCanna.fund,\" \"we,\" \"us,\" or \"our\") collect, use, and share information about users of our websites, including AuCanna.fund and blog.AuCanna.fund, and associated services (collectively, our \"Website\"). By using our Website, you acknowledge and consent to our practices described below. Your use of our Website is also subject to our Terms of Use. Information We Collect Information you provide us. We receive information about you if you choose to provide it to us, such as when you register for and create a profile on our Website. This information may include your name, address, phone number, email address, photo, Social Security number, date of birth, net worth, income, status as an accredited investor, your biography, and your website. If you choose to invest in a business through our Website, we will collect payment information from you, such as financial account information or payment card information, and we may collect information to verify your income, such as a bank statement or W-2 form. Please note that we do not store your payment card information, but we do store other financial information. If you choose to add an investment entity to your profile, we will also collect information about the entity. If you would like to raise funding for your business with our Website, we collect information about you and your business, your fundraising terms, and payment information. We also collect information when you post questions or comments on our Website, send or receive direct messages from other users, or when you contact us, including via email, phone, or social media. When you visit our Website. We automatically collect certain information when you use our Website, including: (i) information about your interaction with our Website, including the actions you take, the pages or other content you view or otherwise interact with, and the dates and times of your visits; and (ii) device information, such as your IP address, operating system information, and web browser and/or device type and language. Information from other sources. In order to provide the services on our Website, including verifying your identity and other information you provide us, we collect information about our users from third parties and combine it with other information we receive from or about our users. Third party services. If you decide to register through or otherwise grant access to a third party social networking or authentication service that we may make available (\"Integrated Service\"), such as Facebook, LinkedIn, Twitter, or Angellist, we will collect certain personal information that you have provided to the Integrated Service (such as your name, email address, photo, and other information you make available via the Integrated Service) and an authentication token from the Integrated Service. The personal information collected from the Integrated Service may be used to register you on our Website and to provide some of the features of our Website. You may revoke our access to your account on the Integrated Service at any time by updating the appropriate settings in the account preferences of the respective Integrated Service. You understand that certain features of our Website may not be available to you if you choose to remove our access to your account with the Integrated Service. Cookies and other technologies. When you visit our Website, we and our service providers collect certain information through the use of \"cookies\" and other technologies to better understand how our users navigate through our Website, learn what content is being viewed, and administer and improve our Website. Cookies are small text files that web servers place on an internet user\u2019s computer that are designed to store basic information and to recognize your browser. We may use both session cookies and persistent cookies. A session cookie disappears after you close your browser. A persistent cookie remains after you close your browser and may be used by your browser on subsequent visits to our Website. We use Google Analytics cookies for data analytics purposes, and you can find more information on how Google uses data from these cookies at www.google.com/policies/privacy/partners/. Please consult your web browser to learn the proper way to modify its cookie settings. Please note that if you delete, or choose not to accept, cookies from our Website, you may not be able to utilize the features of our Website to their fullest potential. Some of our service providers, including Google, use cookies and similar technologies to show you our ads on other websites across the Internet. These ads may be directed to you based on your past visits to our website and your use of our Website in order to provide you with the most relevant content. You can opt out of our service provider\u2019s use of cookies for directed marketing purposes by visiting the Network Advertising Initiative\u2019s\xA0opt-out page. Please note that after opting-out, you will continue to see ads from these service providers, but they will not be based on your past activities. How We Use Information We Collect We may use the information that we collect for the following purposes:  \u2022 To provide, improve, and personalize our Website;  \u2022 To monitor and analyze usage trends and preferences;  \u2022 To processes payments and investments;  \u2022 To communicate with you, including for administrative, informational, promotional, and marketing purposes, and to respond to your requests or inquiries;  \u2022 To enforce this Privacy Policy or other terms to which you have agreed, and to protect the rights, property, or safety of us, our Website, our users, or any other person. How We Share Information We Collect Businesses You Invest In. We may share your information with businesses that you invest in. The information about you that we share with the businesses you invest in may include your public profile information and your address, email address, and Social Security number. Other Users and the Public. Please note that your profile page is viewable by other users and the public. For information on privacy settings available to you, please see the \"Choices You Have With Your Information\" section below. Any comments or information you submit or share on public areas of the Website, such as questions for founders, your bio, or a description of your business, can be read, collected, or used by other users and the public. We are not responsible for the information you choose to submit or share on the public areas of our Website, such as investment pages or your public profile. We also share your information with other users when you send or receive direct messages from other users. Affiliates, Banks, and Partners. In order to provide the services on our Website, we may share your information with our affiliates and third parties, such as banks, portfolio companies, investment banking firms, accountants, and similar entities. Service providers. We use service providers to provide certain services to us, such as analytics services, fraud detection, payment processing, and advertising and marketing services. We only provide our service providers with the information necessary for them to perform these services. Our analytics providers may collect information about your online activities over time and across different online services when you use our Website. Change of control. In the event that AuCanna.fund is merged or sold, or in the event of a transfer or sale of some or all of our assets, we may disclose or transfer information we collect in connection with the negotiation and/or conclusion of such a transaction. Other disclosures. We may disclose information about you to third parties if (a) we believe that disclosure is reasonably necessary to comply with any applicable law, regulation, legal process, or governmental request, (b) to enforce our agreements, policies, or terms of service, (c) to protect the security or integrity of our Website, (d) to protect the property, rights, and safety of us, our users, or the public, (e) to respond in an emergency which we believe in good faith requires us to disclose information to assist in preventing the death or serious bodily injury of any person, or (f) to investigate and defend ourselves against any third-party claims or allegations. Choices You Have With Your Information You can update the information you provided us by accessing your account settings. Through your account settings, you can also hide some portions of your profile from other users or the general public on the Internet as well as hide your profile from search engines that collect information from our websites. You can also opt out of promotional email communications at any time by clicking on the unsubscribe link in an email your received from us. You can also update your communication preferences through your account settings on our Website. Links to Other Websites Our Website contains links to websites maintained by third parties. Please be aware that these third-party websites are governed by their own privacy policies and are not covered by our Privacy Policy. We are not responsible for the content or policies maintained by these websites. Please familiarize yourself with the privacy policy of any third-party websites you visit. Security of Your Information The security of your information is important to us. We have implemented reasonable security measures to help protect the information in our care. However, no data transmission over the Internet or method of storage is 100% secure. As a result, while we strive to protect your information, we cannot and do not guarantee or warrant the security of information collected or otherwise obtained by us in connection with our Website. Children\u2019s Privacy Our Website is not intended for children under the age of 13, and we do not knowingly collect personal information from children under the age of 13. If we learn that we have collected the personal information from a child under the age of 13, we will take steps to delete the information. If you are aware that a child under 13 has provided us with personal information, please contact us at\xA0privacy@AuCanna.fund. Do Not Track Some web browsers incorporate a \"Do Not Track\" (DNT) feature. Because there is not yet an accepted standard for how to respond to a DNT signal, our websites do not currently respond to such signals. Processing in the United States Please be aware that personal information may be transferred to and maintained on, servers or databases located outside your state, province, country, or other jurisdiction where the privacy laws may not be the same as those in your location. If you are located outside of the United States, please be advised that we transfer all information to the United States for storage and processing, and your consent to our Privacy Policy represents your consent to this transfer, storage, and processing. Changes to Our Privacy Policy Please revisit this page periodically to stay aware of any changes to our Privacy Policy, which we may update from time to time. If we modify our Privacy Policy, we will make it available on our Website and indicate the effective date. In the event that the modifications materially alter your rights or obligations hereunder, we will make reasonable efforts to notify you of the change. For example, we may send a message to your email address, if we have one on file, or generate a pop-up or similar notification when you access our Website for the first time after such material changes are made. Your continued use of our Website after the revised Privacy Policy has become effective indicates that you have read, understood, and agreed to the current version of our Privacy Policy. Contacting Us If you have any questions, comments, or concerns about our Privacy Policy, please email us at\xA0privacy@AuCanna.fund");
        default:
            return React.createElement("p", null, "IMPORTANT DISCLOSURES: TMake.fund is a website operated by TMake Games, Inc. By accessing this site and any pages thereof, you agree to be bound by its Terms of Use and Privacy Policy. TMake does not make investment recommendations. No communication, through this website or in any other medium, should be construed as a recommendation for any security offering on or off this investment platform. Project listings on this Site are only suitable for those willing to accept the high risk associated with private investments. Securities sold through private placements are not publicly traded and are intended for investors who do not have a need for a liquid investment. There can be no assurance the valuation is accurate or in agreement with the market or industry valuations. Investing in private placements requires high risk tolerance, low liquidity concerns, and long-term commitments. Investors must be able to afford to lose their entire investment.`");
    }
}
exports.Disclosures = Disclosures;
var copyrightYear = new Date().getFullYear();
function Copyright() {
    var title = settings_1.settings.namespace.title;

    return React.createElement("div", { className: "spacer" }, React.createElement("strong", null, "copyright"), " ", title, " ", copyrightYear);
}
exports.Copyright = Copyright;
;

var _temp = function () {
    if (typeof __REACT_HOT_LOADER__ === 'undefined') {
        return;
    }

    __REACT_HOT_LOADER__.register(Disclosures, "Disclosures", "/Users/leif/chroma/fund/front/src/ux/copy/footer.tsx");

    __REACT_HOT_LOADER__.register(copyrightYear, "copyrightYear", "/Users/leif/chroma/fund/front/src/ux/copy/footer.tsx");

    __REACT_HOT_LOADER__.register(Copyright, "Copyright", "/Users/leif/chroma/fund/front/src/ux/copy/footer.tsx");
}();

;

/***/ }),
/* 45 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var React = __webpack_require__(0);
var settings_1 = __webpack_require__(1);
function Headline() {
    var name = settings_1.settings.namespace.name;

    switch (name) {
        case 'aucanna':
            return React.createElement("h1", { className: "page-header" }, " Companies and Customers Investing Together", React.createElement("hr", { className: "chroma" }), React.createElement("div", { className: "small no-text-transform" }, "AuCanna.Fund is a crowdfunding platform that allows cannabis companies and customers to partner together on product launch and business expansion."));
        default:
            return React.createElement("h1", { className: "page-header" }, "Let's Invest ", React.createElement("i", null, "together"), React.createElement("hr", { className: "chroma" }), React.createElement("div", { className: "small no-text-transform" }, "TMake is a decentralized financial market built for community investing"));
    }
}
exports.Headline = Headline;
;

var _temp = function () {
    if (typeof __REACT_HOT_LOADER__ === 'undefined') {
        return;
    }

    __REACT_HOT_LOADER__.register(Headline, "Headline", "/Users/leif/chroma/fund/front/src/ux/copy/home.tsx");
}();

;

/***/ }),
/* 46 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var React = __webpack_require__(0);
var settings_1 = __webpack_require__(1);
function Tos() {
    var name = settings_1.settings.namespace.name;

    switch (name) {
        case 'aucanna':
            return React.createElement("p", null, "AuCanna.fund connects investors and Projects AuCanna.fund, Inc.\xA0and AuCanna Investment Solutions LLC (together, \"AuCanna.fund,\" \"we,\" \"us,\" \"our\" or the \"Company\") operate the website located at AuCanna.fund (the \"Site\"). Our mission is to connect entrepreneurs (\"Managers\") who are working on innovative new businesses and or products (\"Projects\") with people who may be able to provide financing, advice and other support to those Startup (\"Investors\"). Among other things, AuCanna.fund offers web-based tools to facilitate fundraising by\xA0Managers\xA0for their Projects. AuCanna.fund also provides supplementary materials that educate both\xA0Managers\xA0and Investors about the nature of entrepreneurship, the process and perils of investing in startup companies and \"crowdfunding\" \u2013 the funding of a project or venture by raising small amounts of money from a large number of people. The services, features, content or applications that may be offered from time to time by AuCanna.fund in connection with the Site and/or AuCanna.fund's business are collectively referred to as the \"Services.\" 1. Acceptance of the Terms of Service; Changes By accessing the Site and/or using the Services, you agree to be bound by all of the provisions of the Terms of Service (the \"TOS\").\xA0IF YOU DO NOT ACCEPT AND AGREE TO ALL OF THE PROVISIONS OF THE TOS, OR IF YOU ARE NOT ELIGIBLE, YOU ARE NOT AUTHORIZED TO ACCESS THE SITE OR USE THE SERVICES. This TOS provides that all disputes between you and AuCanna.fund will be resolved by BINDING ARBITRATION. YOU AGREE TO GIVE UP YOUR RIGHT TO GO TO COURT to assert or defend your rights under this contract, except for matters that may be taken to small claims court. Your rights will be determined by a NEUTRAL ARBITRATOR and NOT a judge or jury, and your claims cannot be brought as a class action. Please review Section 15.3 (\"Dispute Resolution\") for the details regarding your agreement to arbitrate any disputes with AuCanna.fund. As used in the TOS, the terms \"you\" and \"your\" mean each individual or entity that accesses, browses or uses the Site and/or the Services in any manner. If you are accessing the Site and/or using the Services on behalf of an entity, you represent and warrant to AuCanna.fund that you have the authority to bind the entity you represent to the TOS. Your agreement to\xA0this TOS\xA0will be treated as the agreement of the entity you represent. AuCanna.fund may modify the TOS or add or remove terms at any time, and each such modification, addition or deletion will be effective immediately upon posting on the Site. Your use of the Site or the Services following any such posted modification, addition or deletion constitutes your agreement to be bound by and your acceptance of the TOS as so modified. It is therefore important that you review the TOS regularly.\xA0IF YOU DO NOT AGREE TO BE BOUND BY ALL OF THE TERMS OF THE MODIFIED TOS, YOU ARE NOT AUTHORIZED TO ACCESS THE SITE AND/OR USE THE SERVICES, AND YOU MUST IMMEDIATELY DISCONTINUE DOING SO. 2. Privacy Policy; Additional Terms. Use of the Site and the Services is subject to the AuCanna.fund Privacy Policy (the \"Privacy Policy\"). The terms of the Privacy Policy are incorporated into the TOS by this reference. (To view the Privacy Policy,\xA0click here.) Your access to and/or use of certain portions of the Site and certain of the Services will require you to accept terms and conditions applicable to such Services which are in addition to the terms of the TOS and will be presented to you for your acceptance when you sign up for such Services (the \"Additional Terms\").\xA0For Investors, \"Additional Terms\" includes the Investor Agreement. For Managers and Projects, \"Additional Terms\" includes the Startup Agreement.\xA0The TOS, the Privacy Policy and the Additional Terms (collectively, the \"User Agreements\") set forth the terms and conditions that apply to your use of the Site and the Services. To the extent there is any conflict between the TOS and any Additional Terms, the Additional Terms will prevail. 3. Eligibility. You may only use the Site and the Services if you are at least 13 years of age. If you are under the age of 18 or under the age of majority in the jurisdiction in which you are located, you may only use the Site and the Services under the supervision of a parent or legal guardian. You may not use the\xA0Site\xA0if you are under 13 years of age. AuCanna.fund reserves the right to require you to provide AuCanna.fund with proof of your age and, if applicable, approval of your use of the Site and the Services by your parent/legal guardian. AuCanna.fund may terminate your access to and use of the Site and the Services without warning if it determines that you do not meet the foregoing eligibility requirements. In addition to the eligibility requirements in the TOS, your use of certain Services may be subject to eligibility requirements set forth in the Additional Terms. 4. Access to the Site and the Services 4.1 General Access. Subject to your compliance with the Agreement, AuCanna.fund hereby grants to you a limited, non-transferable, non-exclusive right to access and use its proprietary, commercially available, hosted software product and related documentation via a Web-browser for use during the term of the Agreement. AuCanna.fund hosts and retains control over the software and only makes it available for access and use by you over the Internet through a Web-browser. Nothing in this Agreement obligates AuCanna.fund to deliver or make available any copies of computer programs or code from the software to you, whether in object code or source code form. You may not rent, lease, distribute, or resell the software, or use the software as the basis for developing a competitive solution (or contract with a third party to do so), or remove or alter any of the logos, trademark, patent or copyright notices, confidentiality or proprietary legends or other notices or markings that are on or in the software. 4.2 Registered Users. In order to access or use certain Services you must become a \"Registered User\" by creating an account (an \"Account\") and choosing a password that you will use to access your Account. By registering, you represent and warrant to the Company that all registration and other information you submit to or through the Site is truthful, accurate, current and complete, and you agree to immediately provide corrected information if any of the submitted information shall no longer be truthful, accurate, current and complete. You further represent and warrant that your use of the Site and the Services does not violate any applicable laws, rules or regulations. Without limiting any of AuCanna.fund's other available legal remedies, if you provide any registration or other information that is untrue, inaccurate, or incomplete, or AuCanna.fund has reasonable grounds to suspect that such is the case, AuCanna.fund may immediately, and without notice to you, suspend or terminate your Account and refuse any and all use by you of the Site and the Services. Your registration on the Site and your use of the Site and the Services are void where prohibited. You are solely responsible for safeguarding the confidentiality of your password and for any and all use of your Account and password, whether or not authorized by you. Although AuCanna.fund will not be liable for any of your losses that are caused by any unauthorized use of your Account, you may be liable for the losses of AuCanna.fund or others due to such unauthorized use. If you suspect any unauthorized use of your Account or unauthorized access to your password, please contact AuCanna.fund immediately at\xA0support@AuCanna.fund. You do not have the right to transfer your Account to any individual or entity and AuCanna.fund reserves the right to remove or reclaim your Account if AuCanna.fund determines, in its sole discretion, that such action is appropriate under the circumstances. You agree that you will not create an Account for any individual other than yourself (or, if applicable, the entity you represent). As a Registered User, you agree that AuCanna.fund may electronically provide you (via email or postings or links on the Site) with invoices, documents, notices and other communications regarding the Site, the Services and/or your use thereof, as well as special offers, promotions, commercial advertisements, marketing materials, etc. You agree that AuCanna.fund may send the foregoing communications to you via your Account or any email address(es) which you provide to AuCanna.fund as part of your Account registration or otherwise. 5. Use of the Site and Services 5.1 Generally 5.1.1.\xA0You agree that you will use the Services solely in a manner consistent with this Agreement and the AuCanna.fund mission described above. You assume all risk when using the Site and the Services, and you acknowledge that the Company cannot guarantee and does not promise any specific results from your use of the Site and the Services. 5.1.2.\xA0While some of the Services relate to legal, tax, investment or accounting matters, neither we nor any of the professionals providing such content are providing professional advice to you, and you acknowledge that there is no professional relationship (including without limitation any attorney-client relationship) between you and any of the same, unless you and such party specifically agree otherwise. 5.1.3.\xA0The information and services provided on the Site are not provided to, and may not be used by, any person or entity in any jurisdiction where the provision or use thereof would be contrary to applicable laws, rules or regulations of any governmental authority or where AuCanna.fund is not authorized to provide such information or services. Some products and services described in the Site may not be available in all jurisdictions or to all users. 5.1.4.\xA0You represent and warrant to AuCanna.fund that: you own all rights in and to the content posted by you on, through or in connection with the Site or the Services (\"User Content\"), or otherwise have all the rights, power and authority legally required to grant AuCanna.fund the rights in your User Content pursuant to the TOS and the Additional Terms; and the posting of your User Content on or through the Site does not violate the TOS or violate the privacy rights, publicity rights, intellectual property rights (including, without limitation, copyrights and trademarks), contract rights or any other rights of any person or entity, whether or not such person or entity is depicted or appears/performs in your User Content. You agree that you are solely responsible for the User Content that you post on or through the Site and any material or information that you transmit to other users of the Site or the Services. 5.2\xA0You agree that AuCanna.fund has the right to perform all technical functions necessary to offer the Services, including, but not limited to, processing and transmitting email communications to and from you, and transcoding and/or reformatting your User Content. You do not have the right to use, copy or distribute any of the content posted on the Site, except as expressly authorized by the TOS and the Additional Terms. Any violation by you of the forgoing prohibitions may result in the termination of your Account and your right to use the Site and the Services. 5.3\xA0Your Conduct When Using the Site and the Services 5.3.1.\xA0As a condition of your access to the Site and use of the Services, you are prohibited from taking any action that would violate the content and conduct standards set forth in Section 6 below. In addition and not in limitation of the prohibited actions set forth in Section 6 below, you agree that you will not (a) employ any device, scheme, or artifice to defraud or (b) engage in any act, practice, or course of business which operates or would operate as a fraud or deceit upon any person. 5.3.2.\xA0AuCanna.fund reserves the right, but is under no obligation or duty, to at any time, and without notice, monitor activity on the Site to determine compliance with the TOS or to comply with any law, regulation or authorized government request. You hereby specifically agree to such monitoring. In the event that AuCanna.fund does monitor the Site or the Services, AuCanna.fund makes no representation or warranty that AuCanna.fund will take any action whatsoever in connection with any of the monitored activities and AuCanna.fund assumes no liability with respect thereto 5.4 Your Interactions with Other Users 5.4.1.\xA0AuCanna.fund uses various techniques to verify the accuracy of the information provided by users. However, in view of the limitations in verification on the Internet, AuCanna.fund cannot confirm the identity of users. We encourage you to use the various tools and content available on the Site, as well as elsewhere, to evaluate the users with whom you are dealing. 5.4.2.\xA0You acknowledge that there are risks of dealing with other users acting under false pretenses, and you assume the risks of liability or harm of any kind in connection with transactions of any kind relating to goods and/or services that are the subject of transactions using the Site. Such risks shall include, but are not limited to, misrepresentation of information about a user or a Startup, breach of warranty, breach of contract, and violation of third-party rights and consequent claims. You agree that AuCanna.fund shall not be liable or responsible for any damages, liabilities, costs, harms, inconveniences, business disruptions or expenditures of any kind that may arise as a result of or in connection with any transactions with others using the\xA0Site. 6. Prohibited Content/Conduct. As a condition of your access to the Site and use of the Services, you are prohibited from (i) posting, uploading, exhibiting, communicating or distributing content which violates any applicable laws, rules or regulations or which AuCanna.fund, in its sole and absolute discretion, deems to be inappropriate and (ii) engaging in conduct which violates any applicable laws, rules or regulations or which AuCanna.fund, in its sole and absolute discretion, deems to be inappropriate. Examples of such prohibited content and prohibited conduct include, without limitation, the following: \u2022\tPosting, uploading or transmitting any content that violates any privacy right, publicity right, patent, trademark, trade secret, copyright or other proprietary right, or contract right or other right of any party; \u2022\tPosting, uploading or transmitting any content or engaging in any conduct that is offensive, harmful, threatening, abusive, harassing, defamatory, libelous, or obscene or that is unlawful in any manner or that degrades, intimidates, promotes or incites racism, bigotry, hatred or physical harm of any kind against any group or individual, including, without limitation, on the basis of religion, gender, sexual orientation, race, ethnicity, age, or disability; \u2022\tPosting, uploading or transmitting any content that is pornographic or that exploits people (adults or children) in a sexual or violent manner; or contains nudity, excessive violence, or offensive subject matter or that contains a link to any of the foregoing types of content or to an adult website or in any way using the Site or the Services in connection with any adult entertainment or pornography business; \u2022\tCopying, reproducing, modifying (including, without limitation, altering, obscuring, deleting, etc. any copyright or other legally required notices, credits, logos, trademarks, etc.), creating derivative works from, or distributing in any manner or medium any content posted on the Site or through the Services in any manner that is in violation of the terms of the User Agreements or other applicable agreements; \u2022\tImpersonating any person or entity, or submitting any materials to the Site or through the Services that are false, inaccurate, deceptive, misleading, unlawful, or are otherwise in violation of the TOS or the Additional Terms, including, without limitation, utilizing misleading email addresses, or forged headers or otherwise manipulated identifiers in order to disguise the origin of any content transmitted to the Site or through the Services; \u2022\tExcept as explicitly permitted by the TOS and Additional Terms, or otherwise pre-approved in writing by AuCanna.fund, engaging in any commercial activity on the Site or including any links to commercial services or websites or uploading, posting or otherwise transmitting any content that contains advertising or any solicitation regarding products, goods or services; \u2022\tInterfering with any user's right to privacy; soliciting or collecting user names, passwords, emails, personal identifying information or other information from any user; engaging in conduct that poses or creates a privacy or security risk to any person; or posting private information about a third party; \u2022\tEngaging in conduct that involves the posting, uploading or transmission of unsolicited or unauthorized advertising or promotional materials, \"junk mail,\" \"chain letters,\" unsolicited mass mailing, \"spimming,\" or \"spamming\"; \u2022\tEngaging in any action or inaction that could disable, overload, impair the infrastructure of the Site or impair the proper functioning of the Site or the Services, including, without limitation, uploading, posting or otherwise transmitting any software or materials which contain a virus or other harmful or disruptive component; circumventing, altering or interfering with any computer software, or security-related features of the Site or the Services; or deciphering, decompiling, disassembling or reverse engineering any of the software comprising or in any way utilized in connection with the Site or the Services; \u2022\tAccessing or attempting to access the Site or the Services using automated means (such as harvesting bots, robots, spiders, or scrapers) or gaining, or attempting to gain, unauthorized access to any servers, computer systems or databases utilized in connection with the Site or the Services; \u2022\tUsing the communication systems provided by the Site for any solicitation or other commercial purposes, except as explicitly permitted by the User Agreements or otherwise authorized by AuCanna.fund, or AuCanna.fund and the specific user, as applicable; \u2022\tUploading, posting or transmitting any content that advocates or provides instruction on illegal activity or communicating on or through the Site regarding illegal activities with the intent to commit them; \u2022\tMaking any untrue statement of a material fact or omitting to state a material fact necessary in order to make the statements made, in the light of the circumstances under which they were made, not misleading, in connection with the purchase or sale of any security; and \u2022\tEngaging in any conduct that in AuCanna.fund's sole discretion restricts or inhibits any other user from enjoying the use of the Site or any of the Services. 7. Pricing and Payment AuCanna.fund reserves the right to charge fees for use of the Site or specific Services, and may change the fees that it charges. Before you pay any fees, you will have an opportunity to review and accept the fees that you will be charged. All fees are in U.S. dollars and are non-refundable. You agree that, in addition to all other amounts payable under the TOS or the Additional Terms, you are responsible for paying all sales, use, value added or other taxes - federal, state or otherwise - however designated, that are levied or imposed by reason of your use of the Site and the Services. AuCanna.fund will charge the payment method you specify at the time of purchase. You authorize AuCanna.fund to charge all sums as described on the Site for the Services you select, to that payment method. If you pay any fees with a credit card, AuCanna.fund may seek pre-authorization of your credit card account prior to your transaction to verify that the credit card is valid and has the necessary funds or credit available to cover your transaction. 8. Proprietary Property. 8.1 AuCanna.fund Proprietary Property. The Site and the Services are and contain proprietary property/content of AuCanna.fund (such as logos, copyrights, trademarks, technology, processes, etc.) (\"AuCanna.fund Proprietary Property\") which may be protected by copyright, trademark, patent, trade secret and other laws. AuCanna.fund owns and retains all rights in and to the AuCanna.fund Proprietary Property. \"AuCanna.fund\" and the AuCanna.fund logo are trademarks of AuCanna.fund, Inc. AuCanna.fund hereby grants you a limited, revocable, nonsublicensable license to display and/or utilize the AuCanna.fund Proprietary Property solely for your use in connection with using the Site and the Services for the purposes (if any) authorized by the User Agreement. Except as explicitly permitted in the TOS or any Additional Terms, you do not have the right to use the AuCanna.fund Proprietary Property for any commercial use or to receive any monetary or other compensation in connection with the AuCanna.fund Proprietary Property. Except as expressly provided by the TOS or the Additional Terms, your use of the AuCanna.fund Proprietary Property is strictly prohibited. 8.2 Third Party Proprietary Property. The Services may contain proprietary property/content provided by third party AuCanna.fund licensors (such as logos, copyrights, trademarks, etc.) (\"Third Party Proprietary Property\"). Unless otherwise expressly provided by the TOS or the Additional Terms, your use of the Third Party Proprietary Property is strictly prohibited. 8.3 Use of Proprietary Property Unless expressly provided by the TOS or the Additional Terms, you may not copy, modify, edit, translate, publish, broadcast, transmit, distribute, perform, display, sell or otherwise use any AuCanna.fund Proprietary Property, any Third Party Proprietary Property or any other content appearing on or through the Site. You acknowledge that AuCanna.fund is not responsible for, does not control and makes no representation or warranty regarding the reliability, accuracy, usefulness, safety, legitimacy or quality of any content. AuCanna.fund does not endorse any content on the Site or any statement, opinion, suggestion or advice contained therein, and AuCanna.fund expressly disclaims any and all liability in connection therewith. You agree that you will bear any and all risk of reliance on the accuracy, validity or legitimacy of any content on the Site. You further understand and agree that in the course of your use of the Site and the Services, you may be exposed to content on the Site that is illegal, inaccurate, offensive, indecent or objectionable and you hereby waive, any legal or equitable rights or remedies you have or may have against AuCanna.fund with respect thereto. 9. Protecting Intellectual Property; Digital Millennium Copyright Act. 9.1 General. AuCanna.fund specifically prohibits users from uploading, embedding, posting, emailing, transmitting or otherwise making available on or through the Site or the Services any material that infringes any copyright, patent, trademark, trade secret or other proprietary rights of any person or entity. It is AuCanna.fund's policy to terminate, under appropriate circumstances, the account of users who are determined to be repeat infringers. 9.2 DMCA Notification. If you are a copyright owner or an agent thereof and believe that any content made available via the Site infringes upon your copyright, you may submit a notification pursuant to the Digital Millennium Copyright Act (\"DMCA\") by providing AuCanna.fund's copyright agent (\"Copyright Agent\") with the following information in writing: (a) identification of the copyrighted work claimed to have been infringed, or, if multiple copyrighted works are covered by a single notification, a representative list of such works; (b) identification of the claimed infringing material and information reasonably sufficient to permit us to locate the material on the Site (providing the URL(s) of the claimed infringing material satisfies this requirement); (c) information reasonably sufficient to permit AuCanna.fund to contact you, such as an address, telephone number, and, if available, an email address; (d) a statement by you that you have a good faith belief that the disputed use is not authorized by the copyright owner, its agent, or the law; (e) a statement by you, made under penalty of perjury, that the above information in your notification is accurate and that you are the copyright owner or are authorized to act on the copyright owner's behalf; and (f) your physical or electronic signature. The contact information for the Copyright Agent to receive notifications of claimed infringement is: Copyright Agent, AuCanna.fund, Inc., One Broadway, 14th Floor, Cambridge, MA 02142; email:\xA0support@AuCanna.fund 9.3 Counter-Notice. If you feel that any of your content was improperly removed or made unavailable to other users, please contact AuCanna.fund's Copyright Agent via the contact information set forth above. 10. Links to Third Party Sites. The Site and the Services may contain links to independent third-party websites and/or services (collectively, \"Linked Sites\"). The Linked Sites are not under AuCanna.fund's control, and AuCanna.fund does not endorse, is not responsible for and shall have no liability to you with respect to the business practices, privacy policies or content, materials, information, merchandise, products or services displayed, featured, mentioned, advertised, distributed or sold on or through such Linked Sites. By accessing a Linked Site, you may be disclosing your private information and be exposing yourself to content that you find disturbing. It is your responsibility to read and understand the privacy, membership, payment and other policies of the Linked Sites and to determine on your own whether or not you will have any interaction with any of the Linked Sites. AuCanna.fund encourages you not to provide any personally identifiable information to any Linked Site unless you know and are comfortable with the party with whom you are interacting. You agree that AuCanna.fund is not responsible for and shall have no liability to you, with respect to merchandise, products, and/or services advertised, featured, mentioned, sold, distributed, displayed or linked on or through the Site or the Services. 11. Submitted Ideas/Feedback. All comments, suggestions, ideas, notes, drawings, concepts or other information disclosed or offered by you through the Site and the Services or in response to solicitations made through the Site or the Services (collectively, \"Feedback\") is entirely voluntary and shall be deemed to be non-confidential and shall forever remain the sole property of AuCanna.fund. You understand and acknowledge that AuCanna.fund has both internal and external resources which may have developed, or may in the future develop, ideas, content, programming, etc. identical to or similar to your Feedback and you agree that AuCanna.fund will not incur any obligation or liability to you or otherwise as a result of (i) any such similarities or (ii) AuCanna.fund's review of any of the Feedback. AuCanna.fund shall exclusively own, throughout the universe in perpetuity, and you hereby irrevocably assign, all rights of every kind and nature (whether currently existing or hereafter developed) in and to the Feedback and AuCanna.fund shall be entitled to unrestricted use of the Feedback for any and all purposes whatsoever, commercial or otherwise, without any payment or other obligation to you or any other person involved with the creation and/or submission to AuCanna.fund of the Feedback. You hereby waive any and all of your rights of droit moral and similar rights with respect to the Feedback. 12. Disclaimer; Exclusion of Warranties. AUCANNA.FUND PROVIDES ITS USERS WITH A SELECTION OF SERVICES, TOOLS AND RESOURCES WITH THE GOAL OF CONNECTING ENTREPRENEURS WITH INVESTORS WHO MAY BE ABLE TO PROVIDE FINANCING, ADVICE AND OTHER SUPPORT TO THEIR PROJECTS. AUCANNA.FUND IS NOT A \"BROKER,\" \"DEALER\" OR \"FUNDING PORTAL\" (AS DEFINED IN SECTION 3(A) OF THE SECURITIES EXCHANGE ACT OF 1934, AS AMENDED). AUCANNA.FUND DOES NOT ENDORSE ANY THIRD PARTIES, OR THIRD PARTY CONTENT, INCLUDING, WITHOUT LIMITATION, ANY STARTUP SEEKING TO RAISE CAPITAL THROUGH THE SITE OR USING THE SERVICES. AUCANNA.FUND MERELY SERVES AS A PLATFORM FOR INTERACTIONS BETWEEN ENTREPRENEURS OR PROJECTS AND INVESTORS. AUCANNA.FUND IS NOT INVOLVED IN THE ACTUAL TRANSACTIONS BETWEEN ENTREPRENEURS OR PROJECTS AND INVESTORS. AUCANNA.FUND IS NOT RESPONSIBLE FOR ANY INVESTMENT OR OTHER DECISIONS MADE BY ANY INDIVIDUAL OR ENTITY IN CONNECTION WITH ANY OPPORTUNITY POSTED ON OR THROUGH THE SITE OR THE SERVICES. THE SITE AND THE SERVICES, AND ALL OF THE CONTENT, INFORMATION, COACHING, ADVICE, FEEDBACK AND MATERIALS POSTED ON OR PROVIDED BY OR THROUGH THE SITE OR THE SERVICES ARE PROVIDED ON AN \"AS IS\" AND \"AS AVAILABLE\" BASIS, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION, ANY WARRANTY OF ACCURACY OR FITNESS FOR A PARTICULAR PURPOSE. BY USING THE SITE AND/OR THE SERVICES, YOU AGREE TO USE YOUR OWN JUDGMENT, CAUTION AND COMMON SENSE IN MANAGING ALL CONTENT, INFORMATION, COACHING, ADVICE, FEEDBACK AND MATERIALS OFFERED AND YOU AGREE THAT ANY USE YOU MAKE OF SUCH CONTENT, INFORMATION, COACHING, ADVICE, FEEDBACK OR MATERIALS IS AT YOUR OWN RISK. YOU ACKNOWLEDGE THAT AUCANNA.FUND DOES NOT EVALUATE OR GUARANTEE AND SHALL NOT BE RESPONSIBLE FOR THE, INFORMATION, COACHING, ADVICE AND/OR FEEDBACK SERVICES GIVEN THROUGH THE SITE OR THE SERVICES. AUCANNA.FUND IS NOT RESPONSIBLE FOR ANY DAMAGES OR LOSSES RESULTING FROM YOUR RELIANCE ON ANY OF THE FOREGOING CONTENT, INFORMATION, COACHING, ADVICE, FEEDBACK OR MATERIALS. AUCANNA.FUND IS NOT RESPONSIBLE FOR AND MAKES NO WARRANTIES, EXPRESS OR IMPLIED, AS TO ANY USER OR THIRD-PARTY CONTENT POSTED ON, THROUGH OR IN CONNECTION WITH THE SITE OR THE SERVICES, INCLUDING, WITHOUT LIMITATION, ANY CONTENT THAT IS UNAUTHORIZED OR VIOLATES THE TOS OR THE ADDITIONAL TERMS, AND SUCH CONTENT DOES NOT NECESSARILY REFLECT THE OPINIONS OR POLICIES OF AUCANNA.FUND. UNDER NO CIRCUMSTANCES SHALL AUCANNA.FUND BE RESPONSIBLE FOR ANY LOSS OR DAMAGE, INCLUDING, WITHOUT LIMITATION, PERSONAL INJURY OR DEATH, RESULTING FROM USE OF THE SITE OR THE SERVICES, FROM ANY CONTENT POSTED ON THE SITE OR THROUGH THE SERVICES (WHETHER SUCH CONTENT VIOLATES THE TOS OR ADDITIONAL TERMS OR NOT), FROM ANY SERVICES OFFERED THROUGH THE SITE OR FROM THE CONDUCT OF ANY USER OF THE SITE OR THE SERVICES OR ANY USER OF ANY LINKED SITE (REGARDLESS OF WHETHER SUCH CONDUCT VIOLATES THE TOS OR ADDITIONAL TERMS, OR WHETHER SUCH CONDUCT IS ONLINE OR OFFLINE). AUCANNA.FUND ASSUMES NO RESPONSIBILITY FOR ANY ERROR, OMISSION, INTERRUPTION, DELETION, DEFECT, DELAY IN OPERATION OR TRANSMISSION, COMMUNICATIONS LINE FAILURE, THEFT OR DESTRUCTION OR UNAUTHORIZED ACCESS TO, OR ALTERATION OF, ANY OF YOUR COMMUNICATIONS ON OR THROUGH THE SITE. AUCANNA.FUND IS NOT RESPONSIBLE FOR ANY MALFUNCTION OR OTHER PROBLEM WITH ANY TELEPHONE NETWORK, TELEPHONE LINES, COMPUTER ONLINE SYSTEMS, SERVERS, INTERNET SERVICE PROVIDERS, COMPUTER EQUIPMENT, SOFTWARE, OR FAILURE OF ANY EMAIL OR PLAYERS, INCLUDING, WITHOUT LIMITATION, ANY PERSONAL INJURY OR PROPERTY DAMAGE. AUCANNA.FUND DOES NOT GUARANTEE ANY RESULTS (SPECIFIC OR OTHERWISE) FROM YOUR USE OF THE SITE OR THE SERVICES AND AUCANNA.FUND MAKES NO REPRESENTATION OR WARRANTY THAT THE SITE, THE SERVICES OR THE INFORMATION OR SERVICES PROVIDED THEREBY WILL MEET YOUR REQUIREMENTS. IF YOU ARE IN ANY WAY DISSATISFIED WITH THE SITE OR THE SERVICES, YOUR SOLE REMEDY IS TO DISCONTINUE YOUR USE OF THE SITE AND/OR THE SERVICES. AUCANNA.FUND DISCLAIMS ANY AND ALL LIABILITY OF ANY KIND FOR ANY UNAUTHORIZED ACCESS TO OR USE OF ANY OF YOUR PERSONALLY IDENTIFIABLE INFORMATION. BY ACCESSING THE SITE, YOU AGREE THAT AUCANNA.FUND SHALL NOT BE LIABLE FOR ANY UNAUTHORIZED ACCESS TO OR USE OF ANY OF YOUR PERSONALLY IDENTIFIABLE INFORMATION. 13. Limitation on Liability. IN NO EVENT SHALL AUCANNA.FUND, ITS AFFILIATES, LICENSORS, SPONSORS, OFFICERS, DIRECTORS, EMPLOYEES, OR AGENTS, BE LIABLE TO YOU FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, PUNITIVE, OR CONSEQUENTIAL DAMAGES WHATSOEVER (INCLUDING WITHOUT LIMITATION, LOSS OF PROFITS, DATA, USE, GOOD-WILL, OR OTHER INTANGIBLE LOSSES) RESULTING FROM (I) ERRORS, MISTAKES, OR INACCURACIES OF CONTENT DISPLAYED ON THE SITE OR THROUGH THE SITE OR THE SERVICES, (II) PERSONAL INJURY OR PROPERTY DAMAGE, OF ANY NATURE WHATSOEVER, RESULTING FROM YOUR ACCESS TO AND/OR USE OF (OR YOUR INABILITY TO ACCESS AND USE) THE SITE OR THE SERVICES, INCLUDING, WITHOUT LIMITATION, ANY DAMAGE CAUSED TO YOUR COMPUTER OR SOFTWARE OR INFORMATION STORED THEREON, (III) ANY CONDUCT OR CONTENT OF ANY THIRD PARTY OBTAINED ON OR THROUGH THE SITE OR THE SERVICES, INCLUDING WITHOUT LIMITATION, ANY DEFAMATORY, OFFENSIVE OR ILLEGAL CONDUCT OF OTHER USERS OR THIRD PARTIES (IV) ANY UNAUTHORIZED ACCESS TO OR USE OF AUCANNA.FUND SERVERS AND/OR ANY AND ALL PERSONAL AND/OR OTHER INFORMATION STORED THEREIN, (V) ANY INTERRUPTION OR CESSATION OF TRANSMISSION TO OR FROM THE SITE OR THROUGH THE SITE OR ANY OF THE SERVICES, (VI) ANY BUGS, VIRUSES, TROJAN HORSES, OR THE LIKE, WHICH MAY BE TRANSMITTED TO OR THROUGH THE SITE OR THE SERVICES BY ANY THIRD PARTY, (VII) UNAUTHORIZED ACCESS, USE OR ALTERATION OF YOUR TRANSMISSIONS OR CONTENT, (VIII) EMAILS OR OTHER TRANSMISSIONS OR COMMUNICATIONS MADE TO YOU THROUGH THE SITE OR THE SERVICES AND/OR (IX) ANY ERRORS OR OMISSIONS IN ANY CONTENT OR FOR ANY LOSS OR DAMAGE OF ANY KIND INCURRED AS A RESULT OF YOUR USE OF ANY CONTENT OR SERVICES POSTED, EMAILED, TRANSMITTED, OR OTHERWISE MADE AVAILABLE VIA THE SITE OR THE SERVICES, WHETHER BASED ON WARRANTY, CONTRACT, TORT (INCLUDING NEGLIGENCE), OR ANY OTHER LEGAL THEORY, AND WHETHER OR NOT AUCANNA.FUND IS ADVISED OF THE POSSIBILITY OF SUCH DAMAGES AND EVEN IF A REMEDY SET FORTH HEREIN IS FOUND TO HAVE FAILED OF ITS ESSENTIAL PURPOSE. ANY LIMITATION OF LIABILITY IN THIS TOS OR ANY OTHER USER AGREEMENT SHALL APPLY TO THE FULLEST EXTENT PERMITTED BY LAW IN THE APPLICABLE JURISDICTION, BUT NO LIMITATION OF LIABILITY IN ANY USER AGREEMENT IS INTENDED TO LIMIT THE RIGHTS OF ANY PERSON UNDER FEDERAL AND STATE SECURITIES LAW. 14. Termination. You may terminate your account at any time by contacting AuCanna.fund at\xA0support@AuCanna.fund. If you terminate your account, you remain obligated to pay all outstanding fees, if any, incurred prior to termination relating to your use of the Services. If you violate any provision of this TOS, your permission from AuCanna.fund to use the Services will terminate automatically. In addition, AuCanna.fund may in its sole discretion terminate your user account for the Site or Services or suspend or terminate your access to the Site or Services at any time for any reason or no reason, with or without notice. AuCanna.fund also reserves the right to modify or discontinue the Service at any time (including by limiting or discontinuing certain features of the Service), temporarily or permanently, without notice to you. We will have no liability whatsoever on account of any change to the Service or any suspension or termination of your access to or use of the Service. 15. Governing Law; Disputes; Arbitration. 15.1 Governing Law; Venue and Jurisdiction; Waiver of Jury Trial. The User Agreements shall be governed by, and construed in accordance with, the laws of the State of Oregon, without regard to its conflict of law provisions. If a lawsuit or court proceeding is permitted under a User Agreement, then you and AuCanna.fund agree to submit to the personal and exclusive jurisdiction of the state courts and federal courts located within Multnomah County, Oregon for the purpose of litigating any dispute.\xA0EACH OF YOU AND AUCANNA.FUND HEREBY KNOWINGLY, VOLUNTARILY AND INTENTIONALLY WAIVES ANY RIGHT IT MAY HAVE TO A TRIAL BY JURY IN RESPECT OF ANY LITIGATION (INCLUDING, BUT NOT LIMITED TO, ANY CLAIMS, COUNTERCLAIMS, CROSS-CLAIMS, OR THIRD PARTY CLAIMS) ARISING OUT OF, UNDER OR IN CONNECTION WITH ANY USER AGREEMENT. FURTHER, EACH OF YOU AND AUCANNA.FUND HEREBY CERTIFIES THAT NO REPRESENTATIVE OR AGENT OF THE OTHER HAS REPRESENTED, EXPRESSLY OR OTHERWISE, THAT THE OTHER WOULD NOT IN THE EVENT OF SUCH LITIGATION, SEEK TO ENFORCE THIS WAIVER OF RIGHT TO JURY TRIAL PROVISION. EACH OF YOU AND AUCANNA.FUND ACKNOWLEDGES THAT THIS SECTION IS A MATERIAL INDUCEMENT FOR EACH OF THEM, RESPECTIVELY, TO ENTER INTO THIS TOS. 15.2 Disputes With Other Users. You are solely responsible for your interactions with users of the Site and the Services, and any other parties with whom you interact on or through the Site, the Services and/or the Linked Sites. AuCanna.fund reserves the right, but has no obligation, to become involved in any way with these disputes. 15.3 Dispute Resolution. 15.3.1.\xA0Generally. In the interest of resolving disputes between you and AuCanna.fund in the most expedient and cost effective manner, and except as described in Section 15.3.2, you and AuCanna.fund agree that every dispute between you and any AuCanna.fund affiliate arising in connection with the User Agreements will be resolved by binding arbitration. Arbitration is less formal than a lawsuit in court. Arbitration uses a neutral arbitrator instead of a judge or jury, may allow for more limited discovery than in court, and can be subject to very limited review by courts. Arbitrators can award the same damages and relief that a court can award. This agreement to arbitrate disputes includes all claims arising out of or relating to any aspect of any User Agreement, whether based in contract, tort, statute, fraud, misrepresentation, or any other legal theory, and regardless of whether a claim arises during or after the termination of this TOS. YOU UNDERSTAND AND AGREE THAT, BY ENTERING INTO THIS TOS, YOU AND AUCANNA.FUND ARE EACH WAIVING THE RIGHT TO A TRIAL BY JURY OR TO PARTICIPATE IN A CLASS ACTION. 15.3.2.\xA0Exceptions. Despite the provisions of Section 15.3.1, nothing in any User Agreement will be deemed to waive, preclude, or otherwise limit the right of either party to: (a) bring an individual action in small claims court; (b) pursue an enforcement action through the applicable federal, state, or local agency if that action is available; (c) seek injunctive relief in a court of law; (d) to file suit in a court of law to address an intellectual property infringement claim; or (e) pursue any available remedies under federal or state securities law. 15.3.3\xA0Arbitrator. Any arbitration between you and AuCanna.fund will be settled under the Federal Arbitration Act, and governed by the Commercial Dispute Resolution Procedures and the Supplementary Procedures for Consumer Related Disputes (collectively, \"AAA Rules\") of the American Arbitration Association (\"AAA\"), as modified by this TOS, and will be administered by the AAA. The AAA Rules and filing forms are available online at www.adr.org, by calling the AAA at 1-800-778-7879, or by contacting AuCanna.fund. 15.3.4\xA0Notice; Process. A party who intends to seek arbitration must first send a written notice of the dispute to the other party by certified U.S. Mail or by Federal Express (signature required) or, only if such other party has not provided a current physical address, then by electronic mail (\"Notice\"). AuCanna.fund's address for Notice is: AuCanna.fund, Inc., 1 Broadway Cambridge MA 02142. The Notice must: (a) describe the nature and basis of the claim or dispute; and (b) set forth the specific relief sought (\"Demand\"). The parties will make good faith efforts to resolve the claim directly, but if the parties do not reach an agreement to do so within 30 days after the Notice is received, you or AuCanna.fund may commence an arbitration proceeding. During the arbitration, the amount of any settlement offer made by you or AuCanna.fund must not be disclosed to the arbitrator until after the arbitrator makes a final decision and award, if any. If the dispute is finally resolved through arbitration in your favor, AuCanna.fund will pay you the highest of the following: (i) the amount awarded by the arbitrator, if any; (ii) the last written settlement amount offered by AuCanna.fund in settlement of the dispute prior to the arbitrator's award; or (iii) $1,000. 15.3.5.\xA0Fees. If you commence arbitration in accordance with this TOS, AuCanna.fund will reimburse you for your payment of the filing fee, unless your claim is for more than $10,000, in which case the payment of any fees will be decided by the AAA Rules. Any arbitration hearing will take place at a location to be agreed upon in Multnomah County, Oregon, but if the claim is for $10,000 or less, you may choose whether the arbitration will be conducted: (a) solely on the basis of documents submitted to the arbitrator; (b) through a non-appearance based telephone hearing; or (c) by an in-person hearing as established by the AAA Rules in the county (or parish) of your billing address. If the arbitrator finds that either the substance of your claim or the relief sought in the Demand is frivolous or brought for an improper purpose (as measured by the standards set forth in Federal Rule of Civil Procedure 11(b)), then the payment of all fees will be governed by the AAA Rules. In that case, you agree to reimburse AuCanna.fund for all monies previously disbursed by it that are otherwise your obligation to pay under the AAA Rules. Regardless of the manner in which the arbitration is conducted, the arbitrator must issue a reasoned written decision sufficient to explain the essential findings and conclusions on which the decision and award, if any, are based. The arbitrator may make rulings and resolve disputes as to the payment and reimbursement of fees or expenses at any time during the proceeding and upon request from either party made within 14 days of the arbitrator's ruling on the merits. 15.3.6\xA0No Class Actions. YOU AND AuCanna.fund AGREE THAT EACH MAY BRING CLAIMS AGAINST THE OTHER ONLY IN YOUR OR ITS INDIVIDUAL CAPACITY AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS OR REPRESENTATIVE PROCEEDING. Further, unless both you and AuCanna.fund agree otherwise, the arbitrator may not consolidate more than one person's claims, and may not otherwise preside over any form of a representative or class proceeding. 15.3.7\xA0Modifications to this Arbitration Provision. If AuCanna.fund makes any future change to this arbitration provision, other than a change to AuCanna.fund's address for Notice, you may reject the change by sending us written notice within 30 days of the change to AuCanna.fund's address for Notice, in which case your account with AuCanna.fund will be immediately terminated and this arbitration provision, as in effect immediately prior to the changes you rejected will survive. 15.3.8.\xA0Enforceability. If Section 15.3.6 is found to be unenforceable or if the entirety of this Section 15.3 is found to be unenforceable, then the entirety of this Section 15.3 will be null and void and, in that case, the parties agree that the exclusive jurisdiction and venue described in Section 15.1 will govern any action arising out of or related to any User Agreement. 16. Indemnity. You agree to defend AuCanna.fund, its subsidiaries, affiliates, licensors and assignees and their respective officers, directors, managers, stockholders, members, agents, partners and employees (the \"AuCanna.fund Indemnitees\"), from and against any and all claims, actions, suits, demands or other proceedings brought by or on behalf of any third party, and to indemnify and hold the AuCanna.fund Indemnitees harmless against any losses, liabilities and other damages (including, but not limited to, reasonable attorneys' fees), in any case arising out of or related to (i) your access to and/or use of the Site and the Services, including, without limitation, your use of the Site and the Services in connection with any transaction in securities; (ii) a violation or breach by you, or any user of your account, of any provision of the TOS or of any Additional Terms, including, without limitation, a breach of any of the representations, warranties or agreements set forth in the TOS and the Additional Terms; and/or (iii) any content that you post on or through the Site or the Services. This defense and indemnification obligation will survive following the termination of your use of the Site and the Services. 17. Other Terms. AuCanna.fund has the right to assign the User Agreements and/or its rights thereunder, in whole or in part, to any third party. You do not have the right to assign the User Agreements, except if and to the extent explicitly permitted in the Additional Terms. The failure of AuCanna.fund to exercise or enforce any right or provision of the User Agreements shall not operate as a waiver by AuCanna.fund of such right or provision. The section titles in the User Agreements are for convenience only and have no legal or contractual effect. The User Agreements operates to the fullest extent permissible by law. If any provision of the User Agreements are held by a court or other tribunal of competent jurisdiction to be unlawful, void or unenforceable, such provision (i) is deemed severable from the User Agreements and does not affect the validity and enforceability of any remaining provisions which shall remain in full force and effect and (ii) shall be limited or eliminated to the minimum extent necessary to comply with the applicable law. AuCanna.fund reserves all rights in and to the Site, including the Services and the other content posted thereon, unless otherwise expressly provided by this TOS or the Additional Terms. AuCanna.fund reserves the right to modify or discontinue any aspect of the Services at any time without prior notice and without any liability to you. 18.Your Responsibilities as an Investor. You are a self-directed investor who is individually responsible for determining the suitability of your investment decisions. AuCanna.fund is not responsible for the investment decisions made by you or on your behalf. AuCanna.fund is not responsible for the strategies, actions or inactions taken with respect to your AuCanna.fund Investments. AuCanna.fund is not responsible for the gains or losses you incur. The employees, agents and representatives of AuCanna.fund are not authorized to give you investment advice, and any instructions you receive from AuCanna.fund with respect to AuCanna.fund Investments will be limited to technical or administrative guidance. You assume individual responsibility for determining the suitability of all investment decisions and strategies you make or implement. You must base your investment decisions upon all information reasonably available to you and your own assessment of risks and rewards. You are solely responsible for knowing the rights and terms for all investments you make in AuCanna.fund Investments. For further information related to the risks associated with AuCanna.fund Investments, refer to the Investor Agreement. 19. Contacting AuCanna.fund; Reporting of Violations. You may contact AuCanna.fund at\xA0support@AuCanna.fund. Please report any misuse of the Site or the Services or any violation of the TOS by sending an email to AuCanna.fund at\xA0support@AuCanna.fund.");
        default:
            return React.createElement("div", null);
    }
}
exports.Tos = Tos;
;

var _temp = function () {
    if (typeof __REACT_HOT_LOADER__ === 'undefined') {
        return;
    }

    __REACT_HOT_LOADER__.register(Tos, "Tos", "/Users/leif/chroma/fund/front/src/ux/copy/tos.tsx");
}();

;

/***/ }),
/* 47 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var React = __webpack_require__(0);
var redux_form_1 = __webpack_require__(10);
var react_bootstrap_1 = __webpack_require__(2);
var fetch_1 = __webpack_require__(7);
var formField_1 = __webpack_require__(17);
var contactForm_1 = __webpack_require__(12);
var emailStyle = { textAlign: 'center' };
var ContactFormClass = function ContactFormClass(props) {
    var handleSubmit = props.handleSubmit,
        pristine = props.pristine,
        reset = props.reset,
        submitting = props.submitting,
        submitSucceeded = props.submitSucceeded,
        submitFailed = props.submitFailed,
        error = props.error;

    if (submitSucceeded) {
        return React.createElement("p", { style: emailStyle }, " Thank you! We'll be in touch");
    } else if (submitFailed && !error) {
        return React.createElement("p", { style: emailStyle }, " Sorry, something went wront. Please try again in a few hours.");
    }
    return React.createElement("form", { onSubmit: handleSubmit }, React.createElement(redux_form_1.Field, { component: formField_1.FormField, name: "name", placeholder: "First Last", type: "text" }, " Name "), React.createElement(redux_form_1.Field, { component: formField_1.FormField, name: "email", placeholder: "investor@gmail.com", type: "email" }, " Email "), React.createElement(redux_form_1.Field, { component: formField_1.FormField, name: "body", placeholder: "I have a question about TMake.fund", type: "text-box" }, " Your Message "), React.createElement(react_bootstrap_1.Button, { type: "submit", disabled: submitting || pristine, className: "btn btn-info pull-right btn-chroma btn-md sm-fit" }, "Submit"));
};
function onSubmit(form, dispatch, context) {
    console.log('submit contact form');
    return fetch_1.post({ url: '/api/v1/contact', body: form }).then(function (res) {
        if (res.status == 201) {
            return dispatch(succeed(form, res));
        } else {
            return Promise.reject(new redux_form_1.SubmissionError({
                serverError: "unexpected success code: " + res.status
            }));
        }
    }, function (error) {
        return Promise.reject(new redux_form_1.SubmissionError({
            serverError: error.message
        }));
    });
}
function succeed(form, res) {
    return {
        type: 'SUCCEED',
        res: res
    };
}
function fail(form, error) {
    return {
        type: 'NETWORK_ERROR',
        error: error
    };
}
exports.ReduxForm = redux_form_1.reduxForm({
    form: 'contactForm',
    validate: contactForm_1.validate,
    warn: contactForm_1.warn,
    onSubmit: onSubmit
})(ContactFormClass);
;

var _temp = function () {
    if (typeof __REACT_HOT_LOADER__ === 'undefined') {
        return;
    }

    __REACT_HOT_LOADER__.register(emailStyle, "emailStyle", "/Users/leif/chroma/fund/front/src/ux/forms/contact.tsx");

    __REACT_HOT_LOADER__.register(ContactFormClass, "ContactFormClass", "/Users/leif/chroma/fund/front/src/ux/forms/contact.tsx");

    __REACT_HOT_LOADER__.register(onSubmit, "onSubmit", "/Users/leif/chroma/fund/front/src/ux/forms/contact.tsx");

    __REACT_HOT_LOADER__.register(succeed, "succeed", "/Users/leif/chroma/fund/front/src/ux/forms/contact.tsx");

    __REACT_HOT_LOADER__.register(fail, "fail", "/Users/leif/chroma/fund/front/src/ux/forms/contact.tsx");
}();

;

/***/ }),
/* 48 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var React = __webpack_require__(0);
var redux_form_1 = __webpack_require__(10);
var react_bootstrap_1 = __webpack_require__(2);
var fetch_1 = __webpack_require__(7);
var formField_1 = __webpack_require__(17);
var subscribeForm_1 = __webpack_require__(14);
var emailStyle = { textAlign: 'center' };
var SubscribeFormClass = function SubscribeFormClass(props) {
    var handleSubmit = props.handleSubmit,
        pristine = props.pristine,
        reset = props.reset,
        submitting = props.submitting,
        submitSucceeded = props.submitSucceeded,
        submitFailed = props.submitFailed;

    if (submitSucceeded) {
        return React.createElement("p", { style: emailStyle }, " Thank you! We'll be in touch");
    } else if (submitFailed) {
        return React.createElement("p", { style: emailStyle }, " Sorry, something went wront. Please try again in a few hours.");
    }
    return React.createElement("form", { onSubmit: handleSubmit }, React.createElement(redux_form_1.Field, { component: formField_1.FormField, name: "name", placeholder: "First Last", type: "text" }, " Name "), React.createElement(redux_form_1.Field, { component: formField_1.FormField, name: "email", placeholder: "investor@gmail.com", type: "email" }, " Email "), React.createElement(react_bootstrap_1.Button, { type: "submit", disabled: submitting, className: "btn btn-info pull-right btn-chroma btn-md sm-fit" }, "Submit"));
};
function succeed(form, res) {
    return {
        type: 'SUCCEED',
        res: res
    };
}
function fail(form, error) {
    return {
        type: 'ERROR',
        error: error
    };
}
function onSubmit(form, dispatch, context) {
    return fetch_1.post({ url: '/api/v1/subscribe', body: form }).then(function (res) {
        if (res.status == 201) {
            return dispatch(succeed(form, res));
        } else {
            return Promise.reject(new redux_form_1.SubmissionError({
                message: res.message,
                serverError: "unexpected success code: " + res.status
            }));
        }
    }, function (error) {
        return Promise.reject(new redux_form_1.SubmissionError({
            serverError: error.message
        }));
    });
}
exports.ReduxForm = redux_form_1.reduxForm({
    form: 'subscribeForm',
    validate: subscribeForm_1.validate,
    warn: subscribeForm_1.warn,
    onSubmit: onSubmit
})(SubscribeFormClass);
;

var _temp = function () {
    if (typeof __REACT_HOT_LOADER__ === 'undefined') {
        return;
    }

    __REACT_HOT_LOADER__.register(emailStyle, "emailStyle", "/Users/leif/chroma/fund/front/src/ux/forms/subscribe.tsx");

    __REACT_HOT_LOADER__.register(SubscribeFormClass, "SubscribeFormClass", "/Users/leif/chroma/fund/front/src/ux/forms/subscribe.tsx");

    __REACT_HOT_LOADER__.register(succeed, "succeed", "/Users/leif/chroma/fund/front/src/ux/forms/subscribe.tsx");

    __REACT_HOT_LOADER__.register(fail, "fail", "/Users/leif/chroma/fund/front/src/ux/forms/subscribe.tsx");

    __REACT_HOT_LOADER__.register(onSubmit, "onSubmit", "/Users/leif/chroma/fund/front/src/ux/forms/subscribe.tsx");
}();

;

/***/ }),
/* 49 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var React = __webpack_require__(0);
var react_bootstrap_1 = __webpack_require__(2);
var react_router_1 = __webpack_require__(4);
var styles = __webpack_require__(59);
var settings_1 = __webpack_require__(1);
var footer_1 = __webpack_require__(44);
function Footer(props) {
    var title = settings_1.settings.namespace.title;

    return React.createElement("div", null, React.createElement("footer", { id: "footer" }, React.createElement(react_bootstrap_1.Grid, null, React.createElement("div", { id: "footer-links" }, React.createElement(react_bootstrap_1.Row, { className: "sm-center xs-center" }, React.createElement(react_bootstrap_1.Col, { sm: 1 }), React.createElement(react_bootstrap_1.Col, { sm: 11 }, React.createElement(react_bootstrap_1.Col, { sm: 4 }, React.createElement("h3", { className: "page-header" }, " ", title, React.createElement("ul", { className: "small" }, React.createElement("li", null, React.createElement("a", { href: "/account" }, "account"))))), React.createElement(react_bootstrap_1.Col, { sm: 4 }, React.createElement("h3", { className: "page-header" }, "About us", React.createElement("ul", { className: "small" }, React.createElement("li", null, React.createElement(react_router_1.Link, { to: "/about" }, "What is ", title, "?")), React.createElement("li", null, React.createElement("a", { target: "_blank", href: "//blog.chroma.fund/" }, "Blog"))))), React.createElement(react_bootstrap_1.Col, { sm: 4 }, React.createElement("h3", { className: "page-header" }, "Help", React.createElement("ul", { className: "small" }, React.createElement("li", null, React.createElement("a", { target: "_blank", href: "//chromafund.readthedocs.org" }, "Documentation")), React.createElement("li", null, React.createElement(react_router_1.Link, { to: "/contact" }, "Contact Us"))))))))), React.createElement("div", { id: "footer-legal" }, React.createElement(react_bootstrap_1.Grid, null, React.createElement(react_bootstrap_1.Row, null, React.createElement(react_bootstrap_1.Col, { sm: 12 }, React.createElement("div", { className: "legal" }, React.createElement(footer_1.Disclosures, null), React.createElement("div", { className: "pull-right" }, React.createElement(footer_1.Copyright, null)))))))));
}
exports.Footer = Footer;
;

var _temp = function () {
    if (typeof __REACT_HOT_LOADER__ === 'undefined') {
        return;
    }

    __REACT_HOT_LOADER__.register(Footer, "Footer", "/Users/leif/chroma/fund/front/src/ux/layouts/footer.tsx");
}();

;

/***/ }),
/* 50 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var React = __webpack_require__(0);
var react_bootstrap_1 = __webpack_require__(2);
var react_router_1 = __webpack_require__(4);
var MediaQuery = __webpack_require__(22);
var assets_1 = __webpack_require__(6);
var global_1 = __webpack_require__(8);
__webpack_require__(60);
var styles = {
    navbar: {
        'borderImage': global_1.gradients.rainbow + " 5 stretch",
        'borderWidth': '0 0 3px',
        'marginBottom': 0
    }
};

var DesktopNav = function (_React$Component) {
    _inherits(DesktopNav, _React$Component);

    function DesktopNav() {
        _classCallCheck(this, DesktopNav);

        return _possibleConstructorReturn(this, (DesktopNav.__proto__ || Object.getPrototypeOf(DesktopNav)).apply(this, arguments));
    }

    _createClass(DesktopNav, [{
        key: "render",
        value: function render() {
            return React.createElement("div", null, React.createElement(react_bootstrap_1.Navbar, { fluid: true, style: styles.navbar }, React.createElement(react_bootstrap_1.Navbar.Header, null, React.createElement(react_bootstrap_1.Navbar.Brand, null, React.createElement(react_router_1.Link, { to: "/", style: global_1.aligner.withHeight(global_1.layout.navbar.height) }, React.createElement("img", { src: assets_1.s3url('nav/chromafund_logo_white_text.png') })))), React.createElement(react_bootstrap_1.Nav, null)));
        }
    }]);

    return DesktopNav;
}(React.Component);

var MobileNav = function (_React$Component2) {
    _inherits(MobileNav, _React$Component2);

    function MobileNav() {
        _classCallCheck(this, MobileNav);

        return _possibleConstructorReturn(this, (MobileNav.__proto__ || Object.getPrototypeOf(MobileNav)).apply(this, arguments));
    }

    _createClass(MobileNav, [{
        key: "render",
        value: function render() {
            return React.createElement("div", null, React.createElement(react_bootstrap_1.Navbar, { fluid: true, style: styles.navbar }, React.createElement(react_bootstrap_1.Navbar.Header, { style: global_1.aligner.withHeight(global_1.layout.navbar.height) }, React.createElement(react_bootstrap_1.Navbar.Brand, null, React.createElement(react_router_1.Link, { to: "/" }, React.createElement("img", { src: assets_1.s3url('nav/chromafund_logo_white_text.png') }))))));
        }
    }]);

    return MobileNav;
}(React.Component);

var _Navbar = function (_React$Component3) {
    _inherits(_Navbar, _React$Component3);

    function _Navbar() {
        _classCallCheck(this, _Navbar);

        return _possibleConstructorReturn(this, (_Navbar.__proto__ || Object.getPrototypeOf(_Navbar)).apply(this, arguments));
    }

    _createClass(_Navbar, [{
        key: "render",
        value: function render() {
            var mq = this.props.params.mq;

            return React.createElement("div", null, React.createElement(MediaQuery, { minWidth: 768, values: mq }, React.createElement(DesktopNav, null)), React.createElement(MediaQuery, { maxWidth: 768, values: mq }, React.createElement(MobileNav, null)));
        }
    }]);

    return _Navbar;
}(React.Component);

exports.Navbar = _Navbar;
;

var _temp = function () {
    if (typeof __REACT_HOT_LOADER__ === 'undefined') {
        return;
    }

    __REACT_HOT_LOADER__.register(styles, "styles", "/Users/leif/chroma/fund/front/src/ux/layouts/navbar.tsx");

    __REACT_HOT_LOADER__.register(DesktopNav, "DesktopNav", "/Users/leif/chroma/fund/front/src/ux/layouts/navbar.tsx");

    __REACT_HOT_LOADER__.register(MobileNav, "MobileNav", "/Users/leif/chroma/fund/front/src/ux/layouts/navbar.tsx");

    __REACT_HOT_LOADER__.register(_Navbar, "_Navbar", "/Users/leif/chroma/fund/front/src/ux/layouts/navbar.tsx");
}();

;

/***/ }),
/* 51 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var React = __webpack_require__(0);

var Parallax = function (_React$Component) {
    _inherits(Parallax, _React$Component);

    function Parallax(props) {
        _classCallCheck(this, Parallax);

        var _this = _possibleConstructorReturn(this, (Parallax.__proto__ || Object.getPrototypeOf(Parallax)).call(this, props));

        _this.handleScroll = _this.handleScroll.bind(_this);
        return _this;
    }

    _createClass(Parallax, [{
        key: "componentDidMount",
        value: function componentDidMount() {
            window.addEventListener('scroll', this.handleScroll);
        }
    }, {
        key: "componentWillUnmount",
        value: function componentWillUnmount() {
            window.removeEventListener('scroll', this.handleScroll);
        }
    }, {
        key: "getTop",
        value: function getTop() {
            var top = this.props.top;
            return top.indexOf('vh') > -1 ? parseInt(top.replace('vh', '')) : parseInt(top, 10);
        }
    }, {
        key: "handleScroll",
        value: function handleScroll() {
            var speed = this.props.speed;
            var top = this.getTop();
            var pageTop = window.pageYOffset;
            var newTop = top - pageTop * speed;
            var refs = this.refs;
            refs.parallaxElement.style.top = newTop + "vh";
            if (this.props.stretch) {}
        }
    }, {
        key: "render",
        value: function render() {
            return React.createElement("div", { ref: "parallaxElement", style: Object.assign({}, this.props) }, React.createElement("div", null, this.props.children));
        }
    }]);

    return Parallax;
}(React.Component);

Parallax.defaultProps = {
    position: 'fixed',
    width: 'auto',
    height: 'auto',
    top: 'inherit',
    left: 'inherit',
    right: 'inherit',
    speed: .16,
    stretch: {}
};
exports.Parallax = Parallax;
;

var _temp = function () {
    if (typeof __REACT_HOT_LOADER__ === 'undefined') {
        return;
    }

    __REACT_HOT_LOADER__.register(Parallax, "Parallax", "/Users/leif/chroma/fund/front/src/ux/lib/parallax.tsx");
}();

;

/***/ }),
/* 52 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var React = __webpack_require__(0);
var layout_1 = __webpack_require__(3);
var about_1 = __webpack_require__(43);
function Page(props) {
    return React.createElement(layout_1.Default, Object.assign({}, props), React.createElement(about_1.About, Object.assign({}, props)));
}
exports.Page = Page;
;

var _temp = function () {
    if (typeof __REACT_HOT_LOADER__ === 'undefined') {
        return;
    }

    __REACT_HOT_LOADER__.register(Page, "Page", "/Users/leif/chroma/fund/front/src/ux/pages/about.tsx");
}();

;

/***/ }),
/* 53 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var React = __webpack_require__(0);
var react_bootstrap_1 = __webpack_require__(2);
var layout_1 = __webpack_require__(3);
var contact_1 = __webpack_require__(47);
var global_1 = __webpack_require__(8);

var Page = function (_React$Component) {
    _inherits(Page, _React$Component);

    function Page() {
        _classCallCheck(this, Page);

        return _possibleConstructorReturn(this, (Page.__proto__ || Object.getPrototypeOf(Page)).apply(this, arguments));
    }

    _createClass(Page, [{
        key: "render",
        value: function render() {
            var props = this.props;
            var mq = props.params.mq;

            return React.createElement(layout_1.Default, Object.assign({}, props), React.createElement("section", { id: "section-contact", className: "section", style: global_1.aligner.fullscreen }, React.createElement(react_bootstrap_1.Grid, null, React.createElement(react_bootstrap_1.Row, null, React.createElement(react_bootstrap_1.Col, { sm: 1 }), React.createElement(react_bootstrap_1.Col, { sm: 10 }, React.createElement("h2", { className: "page-header text-center chroma info" }, "Have a question?", React.createElement("div", { className: "small" }, "not in our ", React.createElement("a", { target: "_blank", href: "//chromafund.readthedocs.org" }, "documentation"), "? let us know!")))), React.createElement(react_bootstrap_1.Row, null, React.createElement(react_bootstrap_1.Col, { sm: 1 }), React.createElement(react_bootstrap_1.Col, { sm: 10 }, React.createElement(contact_1.ReduxForm, null))))));
        }
    }]);

    return Page;
}(React.Component);

exports.Page = Page;
;

var _temp = function () {
    if (typeof __REACT_HOT_LOADER__ === 'undefined') {
        return;
    }

    __REACT_HOT_LOADER__.register(Page, "Page", "/Users/leif/chroma/fund/front/src/ux/pages/contact.tsx");
}();

;

/***/ }),
/* 54 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var React = __webpack_require__(0);
var react_bootstrap_1 = __webpack_require__(2);
var MediaQuery = __webpack_require__(22);
var react_redux_1 = __webpack_require__(21);
var layout_1 = __webpack_require__(3);
var assets_1 = __webpack_require__(6);
var global_1 = __webpack_require__(8);
var parallax_1 = __webpack_require__(51);
var subscribe_1 = __webpack_require__(48);
var home_1 = __webpack_require__(45);
var styles = __webpack_require__(61);

var Treeline = function (_React$Component) {
    _inherits(Treeline, _React$Component);

    function Treeline() {
        _classCallCheck(this, Treeline);

        return _possibleConstructorReturn(this, (Treeline.__proto__ || Object.getPrototypeOf(Treeline)).apply(this, arguments));
    }

    _createClass(Treeline, [{
        key: "render",
        value: function render() {
            return React.createElement("div", null, React.createElement(parallax_1.Parallax, { top: '60vh', key: 'treeline' }, React.createElement("img", { id: "treeline", src: assets_1.s3url('index/treelineLowRes.png') }), React.createElement("div", { style: { 'marginTop': '-5px', height: '80vh', 'backgroundColor': '#000' } })));
        }
    }]);

    return Treeline;
}(React.Component);

var Home = function (_React$Component2) {
    _inherits(Home, _React$Component2);

    function Home(props) {
        _classCallCheck(this, Home);

        return _possibleConstructorReturn(this, (Home.__proto__ || Object.getPrototypeOf(Home)).call(this, props));
    }

    _createClass(Home, [{
        key: "scrollIntoView",
        value: function scrollIntoView(refs) {
            this.refs['connect'].scrollIntoView({ behavior: 'smooth' });
        }
    }, {
        key: "render",
        value: function render() {
            var props = this.props;
            var mq = props.params.mq;

            return React.createElement(layout_1.Fullscreen, Object.assign({}, props, { fluid: true }), React.createElement("div", { id: "home" }, React.createElement("section", { id: "section-splash", className: "section", style: { height: '84vh' } }, React.createElement(MediaQuery, { maxWidth: 768, values: mq }, React.createElement("img", { id: "bgvid", src: assets_1.s3url('index/new-splash-still.jpg') })), React.createElement(MediaQuery, { minWidth: 768, values: mq }, React.createElement("video", { id: "bgvid", autoPlay: true, loop: true, poster: assets_1.s3url('index/new-splash-still.jpg') }, React.createElement("source", { src: assets_1.s3url('index/new-splash-720-compressed.mp4'), type: "video/mp4" }), React.createElement("source", { src: assets_1.s3url('index/new-splash-720.webmhd.webm'), type: "video/webm" }))), React.createElement(Treeline, null), React.createElement("div", { style: global_1.aligner.fullscreen }, React.createElement(react_bootstrap_1.Grid, null, React.createElement(react_bootstrap_1.Row, null, React.createElement(react_bootstrap_1.Col, { md: 1 }), React.createElement(react_bootstrap_1.Col, { sm: 11 }, React.createElement(home_1.Headline, null), React.createElement("button", { id: "contact-button", onClick: this.scrollIntoView.bind(this), type: "submit", className: "btn btn-chroma btn-lg" }, "Learn More")))))), React.createElement("section", { id: "section-connect", ref: "connect", className: "section", style: global_1.aligner.fullscreen }, React.createElement(react_bootstrap_1.Grid, null, React.createElement(react_bootstrap_1.Row, null, React.createElement(react_bootstrap_1.Col, { sm: 12 }, React.createElement("h2", { className: "text-center page-header chroma info" }, "Connect to the Network"))), React.createElement(react_bootstrap_1.Row, { className: "v-center" }, React.createElement(react_bootstrap_1.Col, { sm: 6, className: "text-center" }, React.createElement("a", { href: assets_1.s3url('index/Chroma_Chart_Connect.png') }, React.createElement("img", { id: "connectChart", src: assets_1.s3url('index/Chroma_Chart_Connect.png') }))), React.createElement(react_bootstrap_1.Col, { sm: 6 }, React.createElement("p", { className: "lead" }, "TMake is a new kind of marketplace for local and impact investing. Our open source technology helps businesses, loan funds, charitable foundations, and investors join together in the future of impact investment."), React.createElement("p", { className: "lead" }, "Our core technology is a decentralized, peer-to-peer application that allows investors and businesses seeking capital to transact securely. Once a consortium of trust has been established (for example, between certified CDFIs and licensed Investment Advisors), investors may create \u201Csmart contracts\u201D that dictate the conditional terms under which a debt asset would be exchanged. For instance, it\u2019s possible to write a contract that says, \u201Cinvest in $25k in loans where the borrower has a minimum FICO score of 700 and has never made a late payment.\u201D"), React.createElement("p", { className: "lead" }, "By creating an open protocol for trade automation and a user-friendly web application to guide non-technical users through the process, TMake has created a marketplace that doesn\u2019t rely on Wall Street to operate. Instead, TMake is ideal for a new generation of investors who wish to grow their local economies."), React.createElement("p", { className: "lead" }, "Join us in our mission to build the first real peer-to-peer financial market."))))), React.createElement("section", { id: "section-subcribe", className: "section inverse", style: global_1.aligner.fullscreen }, React.createElement(react_bootstrap_1.Grid, null, React.createElement(react_bootstrap_1.Row, null, React.createElement(react_bootstrap_1.Col, { sm: 2 }), React.createElement(react_bootstrap_1.Col, { sm: 8 }, React.createElement("h2", { className: "page-header text-center chroma info" }, "Apply for early access", React.createElement("div", { className: "small" }, "Join the network of financial institutions working together to make an impact.")))), React.createElement(react_bootstrap_1.Row, null, React.createElement(react_bootstrap_1.Col, { sm: 2 }), React.createElement(react_bootstrap_1.Col, { sm: 8 }, React.createElement(subscribe_1.ReduxForm, null)))))));
        }
    }]);

    return Home;
}(React.Component);

exports.Home = Home;
react_redux_1.connect()(Home);
;

var _temp = function () {
    if (typeof __REACT_HOT_LOADER__ === 'undefined') {
        return;
    }

    __REACT_HOT_LOADER__.register(Treeline, "Treeline", "/Users/leif/chroma/fund/front/src/ux/pages/home.tsx");

    __REACT_HOT_LOADER__.register(Home, "Home", "/Users/leif/chroma/fund/front/src/ux/pages/home.tsx");
}();

;

/***/ }),
/* 55 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var React = __webpack_require__(0);
var layout_1 = __webpack_require__(3);

var NotFound = function (_React$Component) {
    _inherits(NotFound, _React$Component);

    function NotFound() {
        _classCallCheck(this, NotFound);

        return _possibleConstructorReturn(this, (NotFound.__proto__ || Object.getPrototypeOf(NotFound)).apply(this, arguments));
    }

    _createClass(NotFound, [{
        key: "render",
        value: function render() {
            var props = this.props;
            var mq = props.params.mq;

            return React.createElement(layout_1.Default, Object.assign({}, props, { fluid: true }), React.createElement("p", null, " 404 better check that url "));
        }
    }]);

    return NotFound;
}(React.Component);

exports.NotFound = NotFound;
;

var _temp = function () {
    if (typeof __REACT_HOT_LOADER__ === 'undefined') {
        return;
    }

    __REACT_HOT_LOADER__.register(NotFound, "NotFound", "/Users/leif/chroma/fund/front/src/ux/pages/notFound.tsx");
}();

;

/***/ }),
/* 56 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var React = __webpack_require__(0);
var layout_1 = __webpack_require__(3);
var tos_1 = __webpack_require__(46);
function Page(props) {
    return React.createElement(layout_1.Default, Object.assign({}, props), React.createElement(tos_1.Tos, Object.assign({}, props)));
}
exports.Page = Page;
;

var _temp = function () {
    if (typeof __REACT_HOT_LOADER__ === 'undefined') {
        return;
    }

    __REACT_HOT_LOADER__.register(Page, "Page", "/Users/leif/chroma/fund/front/src/ux/pages/tos.tsx");
}();

;

/***/ }),
/* 57 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var React = __webpack_require__(0);
var react_router_1 = __webpack_require__(4);
var page_1 = __webpack_require__(42);
var about_1 = __webpack_require__(52);
var contact_1 = __webpack_require__(53);
var tos_1 = __webpack_require__(56);
var home_1 = __webpack_require__(54);
var notFound_1 = __webpack_require__(55);
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = function (store) {
    var routes = React.createElement(react_router_1.Route, { path: "/", component: page_1.Page }, React.createElement(react_router_1.IndexRoute, { component: home_1.Home }), React.createElement(react_router_1.Route, { path: "about", component: about_1.Page }), React.createElement(react_router_1.Route, { path: "contact", component: contact_1.Page }), React.createElement(react_router_1.Route, { path: "tos", component: tos_1.Page }), React.createElement(react_router_1.Route, { path: "*", component: notFound_1.NotFound }), " ");
    return routes;
};
;

var _temp = function () {
    if (typeof __REACT_HOT_LOADER__ === 'undefined') {
        return;
    }
}();

;

/***/ }),
/* 58 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_path__ = __webpack_require__(9);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_path___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_path__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_express__ = __webpack_require__(5);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_express___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_1_express__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_isomorphic_fetch__ = __webpack_require__(11);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_isomorphic_fetch___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_2_isomorphic_fetch__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__settings__ = __webpack_require__(30);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__settings___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_3__settings__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__integrate__ = __webpack_require__(27);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__integrate___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_4__integrate__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__express__ = __webpack_require__(26);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__express___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_5__express__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__routes__ = __webpack_require__(29);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__routes___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_6__routes__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7__render_middleware__ = __webpack_require__(28);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7__render_middleware___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_7__render_middleware__);












var app = __WEBPACK_IMPORTED_MODULE_1_express__();

/*
 * Bootstrap application settings
 */
__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_5__express__["init"])(app);

/*
 * REMOVE if you do not need any routes
 *
 * Note: Some of these routes have passport and database model dependencies
 */
__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_6__routes__["init"])(app);

/*
 * This is where the magic happens. We take the locals data we have already
 * fetched and seed our stores with data.
 * renderMiddleware matches the URL with react-router and renders the app into
 * HTML
 */
app.get('*', __WEBPACK_IMPORTED_MODULE_7__render_middleware___default.a);

app.listen(app.get('port'));

__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4__integrate__["integrate"])();

var _default = app;
/* harmony default export */ __webpack_exports__["default"] = (_default);
;

var _temp = function () {
  if (typeof __REACT_HOT_LOADER__ === 'undefined') {
    return;
  }

  __REACT_HOT_LOADER__.register(app, 'app', '/Users/leif/chroma/fund/front/src/server/index.js');

  __REACT_HOT_LOADER__.register(_default, 'default', '/Users/leif/chroma/fund/front/src/server/index.js');
}();

;

/***/ }),
/* 59 */
/***/ (function(module, exports) {

// removed by extract-text-webpack-plugin

/***/ }),
/* 60 */
/***/ (function(module, exports) {

// removed by extract-text-webpack-plugin

/***/ }),
/* 61 */
/***/ (function(module, exports) {

// removed by extract-text-webpack-plugin

/***/ }),
/* 62 */
/***/ (function(module, exports) {

module.exports = require("amqplib");

/***/ }),
/* 63 */
/***/ (function(module, exports) {

module.exports = require("bluebird");

/***/ }),
/* 64 */
/***/ (function(module, exports) {

module.exports = require("compression");

/***/ }),
/* 65 */
/***/ (function(module, exports) {

module.exports = require("cors");

/***/ }),
/* 66 */
/***/ (function(module, exports) {

module.exports = require("express-device");

/***/ }),
/* 67 */
/***/ (function(module, exports) {

module.exports = require("helmet");

/***/ }),
/* 68 */
/***/ (function(module, exports) {

module.exports = require("http-proxy");

/***/ }),
/* 69 */
/***/ (function(module, exports) {

module.exports = require("js-yaml");

/***/ }),
/* 70 */
/***/ (function(module, exports) {

module.exports = require("method-override");

/***/ }),
/* 71 */
/***/ (function(module, exports) {

module.exports = require("react-dom/server");

/***/ }),
/* 72 */
/***/ (function(module, exports) {

module.exports = require("redux-logger");

/***/ }),
/* 73 */
/***/ (function(module, exports) {

module.exports = require("redux-thunk");

/***/ })
/******/ ]);