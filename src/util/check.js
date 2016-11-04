import _ from 'underscore';

const isNumeric = val => !isNaN(parseFloat(val)) && isFinite(val);
const _c = function(val, type) {
  switch (type) {
    case String: case "String": return typeof val === 'string' && !isNumeric(val);
    case Number: case "Number": return isNumeric(val);
    case Array: case "Array": return Array.isArray(val);
    case Function: case "Function": return _.isFunction(val);
    case Object: case "Object": return val !== null && typeof val === 'object' && !_c(val, Array) && !_c(val, Error);
    case "Boolean": return typeof val === 'boolean';
    case Error: case "Error": return val instanceof Error;
    case undefined: case "Undefined": return val === undefined;
    default: throw `checking unsupported type ${type}`;
  }
};

const _check = function(val, type) {
  if (_c(type, "Array")) {
    return _.any(type, sType => _c(val, sType));
  } else { return _c(val, type); }
};

export default function(val, type) { return _check(val, type); };
