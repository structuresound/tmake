import _ from 'underscore';
import check from '../util/check';

function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

function prune(el) {
  _.each(el, (val, key) => {
    if (Array.isArray(val)) {
      if (val.length && !isEmpty(val)) {
        if (prune(val)) {
          return delete el[key];
        }
      } else {
        return delete el[key];
      }
    } else if (val !== null && typeof val === 'object') {
      if (Object.keys(val).length && !isEmpty(val)) {
        if (prune(val)) {
          return delete el[key];
        }
      } else {
        return delete el[key];
      }
    }
  });
  return isEmpty(el);
}

function isEmpty(el) {
  let containsValid = 0;
  _.each(el, (val) => {
    if (val || isNumeric(val)) {
      containsValid = true;
    }
  });
  return !containsValid;
}

function setValueForKeyPath(value, keyPath, current) {
  const keys = keyPath.split('.');
  for (const i in keys) {
    if (keys[i]) {
      const thisKey = keys[i];
      if (keys.length > i) {
        const nextKey = keys[i + 1];
        if (isNumeric(nextKey)) {
          if (Array.isArray(current)) {
            if (!Array.isArray(current[parseInt(thisKey, 10)])) {
              current[parseInt(thisKey, 10)] = [];
            }
          } else {
            if (!Array.isArray(current[thisKey])) {
              current[thisKey] = [];
            }
          }
        } else {
          if (Array.isArray(current)) {
            if (current[parseInt(thisKey, 10)] === null || typeof current[parseInt(thisKey, 10)] !== 'object') {
              current[parseInt(thisKey, 10)] = {};
            }
          } else {
            if (current[thisKey] === null || typeof current[thisKey] !== 'object') {
              current[thisKey] = {};
            }
          }
        }
      }
      if (Array.isArray(current)) {
        current = current[parseInt(thisKey, 10)];
      } else {
        current = current[thisKey];
      }
    }
  }
  const lastKey = keys[keys.length - 1];
  if (Array.isArray(current)) {
    return current[parseInt(lastKey, 10)] = value;
  } else if (current !== null && typeof current === 'object') {
    return current[lastKey] = value;
  }
};

const mergeValueAtKeypath = function(value, keyPath, current) {
  const existing = valueForKeyPath(keyPath, current);
  const merged = value;
  if (check(value, Object) && check(existing, Object)) {
    merged = _.extend(existing, value);
  }
  return setValueForKeyPath(merged, keyPath, current);
};

const unsetKeyPath = function(keyPath, obj) {
  const keys = keyPath.split('.');
  const i = 0;
  const current = obj;
  while (i < keys.length - 1) {
    const key = keys[i];
    if (Array.isArray(current)) {
      if (!current[parseInt(key, 10)]) {
        return 0;
      }
      current = current[parseInt(key, 10)];
    } else if (current !== null && typeof current === 'object') {
      if (!current[key]) {
        return 0;
      }
      current = current[key];
    }
    i++;
  }
  const lastKey = keys[keys.length - 1];
  if (Array.isArray(current)) {
    const index = parseInt(lastKey, 10);
    if (current[index] !== undefined) {
      delete current[index];
      prune(obj);
      return 1;
    }
    return 0;
  } else {
    if (current[lastKey] !== undefined) {
      delete current[lastKey];
      if (Object.keys(current).length === 0) {
        prune(obj);
      }
      return 1;
    }
    return 0;
  }
};

var valueForKeyPath = function(keyPath, current) {
  if (!current) {
    return undefined;
  }
  const keys = keyPath.split('.');
  const i = 0;
  while (i < keys.length - 1) {
    const key = keys[i];
    if (Array.isArray(current)) {
      if (!current[parseInt(key, 10)]) {
        return undefined;
      }
      current = current[parseInt(key, 10)];
    } else if (current !== null && typeof current === 'object') {
      if (!current[key]) {
        return undefined;
      }
      current = current[key];
    }
    i++;
  }
  const lastKey = keys[keys.length - 1];
  if (Array.isArray(current)) {
    return current[parseInt(lastKey, 10)];
  } else {
    return current[lastKey];
  }
};

const keyPaths = function(obj, stack, parent, allLevels) {
  // returns an array '.' separated strings for keys + nested keys present in object
  stack = stack || [];
  const keys = Object.keys(obj);
  keys.forEach(function(el) {
    //if it's a nested object
    if (Array.isArray(obj[el])) {
      if (allLevels) {
        stack.push(parent
          ? parent + '.' + el
          : el);
      }
      const i = 0;
      while (i < obj[el].length) {
        if (parent) {
          var p = parent + '.' + el + `.${i}`;
        } else {
          var p = el + `.${i}`;
        }
        const s = obj[el][i];
        if (Array.isArray(s) || (s !== null && typeof s === 'object')) {
          keyPaths(s, stack, p);
        } else {
          stack.push(p);
        }
        i++;
      }
    } else if (obj[el]instanceof Date) {
      const key = parent
        ? parent + '.' + el
        : el;
      stack.push(key);
    } else if (obj[el] !== null && typeof obj[el] === 'object') {
      if (allLevels) {
        stack.push(parent
          ? parent + '.' + el
          : el);
      }
      var p = parent
        ? parent + '.' + el
        : el;
      keyPaths(obj[el], stack, p);
    } else {
      stack.push(parent
        ? parent + '.' + el
        : el);
    }
  });
  return stack;
};

const validateSelector = function(val, key, test) {
  if (!check(val, Object)) {
    return false;
  }
  if (!test(val, key)) {
    return false;
  }
  return true;
};

const shallowSearch = function(current, selectors, test, stack, height) {
  if (stack[height] == null) {
    stack[height] = {};
  }
  for (const prop in current) {
    if (_.contains(selectors, prop)) {
      if (validateSelector(current[prop], prop, test)) {
        shallowSearch(current[prop], selectors, test, stack, height + 1);
      }
    } else {
      stack[height][prop] = current[prop];
    }
  }
  return stack;
};

const flatten = function(stack) {
  const flat = {};
  for (const level in stack) {
    _.extend(flat, stack[level]);
  }
  return flat;
};

const matchesSelectors = function(keywords, selector) {
  if (selector.indexOf(' ') !== -1) {
    const selectors = selector.split(' ');
    const matches = _.intersection(keywords, selectors);
    return matches.length > 0;
  } else {
    return _.contains(keywords, selector);
  }
};

const deepSearch = function(object, selectors, test) {
  const keys = keyPaths(object);
  const stack = [];
  _.each(keys, function(key) {
    const priority = 0;
    const filtered = key;
    const unfiltered = key.split('.');
    const valid = true;
    _.each(unfiltered, function(kp) {
      if (matchesSelectors(selectors, kp)) {
        if (test(0, kp)) {
          priority += 1;
          filtered = filtered.replace(`${kp}.`, '');
          return filtered = filtered.replace(`.${kp}`, '');
        } else {
          return valid = false;
        }
      }
    });
    if (valid) {
      if (stack[priority] == null) {
        stack[priority] = {};
      }
      const val = valueForKeyPath(key, object);
      // if stack[priority][filtered] && check val, Object
      //   for k of val
      //     stack[priority][filtered][k] = val[k]
      // else
      //console.log 'set', priority, filtered, val
      return stack[priority][filtered] = val;
    }
  });
  const flat = {};
  _.each(stack, priority => _.each(priority, (v, k) => mergeValueAtKeypath(v, k, flat)));
  return flat;
};

export default {
  deep(tree, selectors, testOrValidSelectors) {
    const test = testOrValidSelectors;
    if (testOrValidSelectors) {
      if (!check(testOrValidSelectors, Function)) {
        test = (val, key) => matchesSelectors(testOrValidSelectors, key);
      }
    } else {
      test = () => true;
    }
    return deepSearch(tree, selectors, test);
  },

  shallow(tree, selectors, testOrValidSelectors) {
    const test = testOrValidSelectors;
    if (testOrValidSelectors) {
      if (!check(testOrValidSelectors, Function)) {
        test = (val, key) => matchesSelectors(testOrValidSelectors, key);
      }
    } else {
      test = () => true;
    }
    return flatten(shallowSearch(tree, selectors, test, [], 0));
  },

  matchesSelectors,
  valueForKeyPath
};
