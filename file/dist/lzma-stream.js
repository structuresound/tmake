"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var through = require("through");
var lzma_1 = require("lzma");
function skipLeadingZeroes(buffer) {
    var i;
    for (i = 0; i < buffer.length; i++) {
        if (buffer[i] !== 0x00)
            break;
    }
    return buffer.slice(i);
}
function unxz() {
    var beginning = 1;
    return through(function write(data) {
        var _this = this;
        if (beginning) {
            beginning = 0;
            lzma_1.decompress(skipLeadingZeroes(data), function (result, error) {
                console.log('beginning', data, 'o:', result, error);
                _this.queue(result);
            });
        }
        else {
            lzma_1.decompress(data, function (result, error) {
                console.log('o:', result, error);
                _this.queue(result);
            });
        }
    });
}
exports.unxz = unxz;
function xz(level) {
    if (level === void 0) { level = 1; }
    return through(function write(data) {
        var _this = this;
        lzma_1.compress(data, level, function (result) {
            _this.queue(result);
        });
    });
}
exports.xz = xz;
