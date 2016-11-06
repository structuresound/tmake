import _ from 'underscore';
import {check, diff} from '1e1f-tools';

function validateSelector(val, key, test) {
  if (!check(val, Object)) {
    return false;
  }
  if (!test(val, key)) {
    return false;
  }
  return true;
}

function deepSearch(object, selectors, test, stack, height) {
  const keys = diff.keyPaths(object);
  if (stack[height || 0] == null) {
    stack[height || 0] = {};
  }
  _.each(keys, (key) => {
    let priority = 0;
    let filtered = key;
    const unfiltered = key.split('.');
    let valid = true;
    _.each(unfiltered, (kp) => {
      if (matchesSelectors(selectors, kp)) {
        if (test(0, kp)) {
          priority += 1;
          filtered = filtered.replace(`${kp}.`, '');
          filtered = filtered.replace(`.${kp}`, '');
        } else {
          valid = false;
        }
      }
    });
    if (valid) {
      if (stack[priority] == null) {
        stack[priority] = {};
      }
      const val = valueForKeyPath(key, object);
      stack[priority][filtered] = val;
    }
  });
  const flat = {};
  _.each(stack, (priority) => {
    _.each(priority, (v, k) => {
      mergeValueAtKeypath(v, k, flat);
    });
  });
  return flat;
}

function shallowSearch(current, selectors, test, stack, height) {
  if (stack[height || 0] == null) {
    stack[height || 0] = {};
  }
  for (const prop of Object.keys(current)) {
    if (_.contains(selectors, prop)) {
      if (validateSelector(current[prop], prop, test)) {
        shallowSearch(current[prop], selectors, test, stack, height + 1);
      }
    } else {
      stack[height][prop] = current[prop];
    }
  }
  return stack;
}

function flatten(stack) {
  const flat = {};
  for (const level of Object.keys(stack)) {
    _.extend(flat, stack[level]);
  }
  return flat;
}

function matchesSelectors(keywords, selector) {
  if (selector.indexOf(' ') !== -1) {
    const selectors = selector.split(' ');
    const matches = _.intersection(keywords, selectors);
    return matches.length > 0;
  }
  return _.contains(keywords, selector);
}

function search(tree, selectors, testOrValidSelectors, searchFn) {
  let test = testOrValidSelectors;
  if (testOrValidSelectors) {
    if (!check(testOrValidSelectors, Function)) {
      test = (val, key) => {
        return matchesSelectors(testOrValidSelectors, key);
      };
    }
  } else {
    test = () => {
      return true;
    };
  }
  return searchFn(tree, selectors, test, [], 0);
}

export default {
  deep(tree, selectors, testOrValidSelectors) {
    return search(tree, selectors, testOrValidSelectors, deepSearch);
  },
  shallow(tree, selectors, testOrValidSelectors) {
    return flatten(search(tree, selectors, testOrValidSelectors, shallowSearch));
  },
  matchesSelectors,
  valueForKeyPath
};
