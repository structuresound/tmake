import _ from 'lodash';
import {check, diff} from 'js-object-tools';
import {replaceAll} from './string';
import log from './log';

function deepSearch(object, keywords, selectors, stack) {
  for (const key of diff.keyPaths(object)) {
    let priority = 0;
    let filtered = key;
    const unfiltered = key.split('.');
    let valid = true;
    for (const kp of unfiltered) {
      if (select(keywords, kp)) {
        if (select(selectors, kp)) {
          priority += 1;
          filtered = filtered.replace(`${kp}.`, '');
          filtered = filtered.replace(`.${kp}`, '');
        } else {
          valid = false;
        }
      }
    }
    if (valid) {
      if (stack[priority] == null) {
        stack[priority] = {};
      }
      const val = diff.valueForKeyPath(key, object);
      stack[priority][filtered] = val;
    }
  }
  const flat = {};
  _.each(stack, (priority) => {
    _.each(priority, (v, k) => {
      diff.mergeValueAtKeypath(v, k, flat);
    });
  });
  return flat;
}

function shallowSearch(current, keywords, selectors, stack, height) {
  if (!check(stack[height], Object)) {
    stack[height] = {};
  }
  for (const key of Object.keys(current)) {
    if (select(keywords, key)) {
      if (select(selectors, key)) {
        shallowSearch(current[key], keywords, selectors, stack, height + 1);
      }
    } else {
      if (check(current[key], Object)) {
        stack[height][key] = flatten(shallowSearch(current[key], keywords, selectors, [], 0));
      } else {
        stack[height][key] = current[key];
      }
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

function parseAnd(input, cssString) {
  if (cssString.indexOf(' ') !== -1) {
    return diff.every(cssString.split(' '), (subCssString) => {
      return diff.contains(input, subCssString);
    });
  }
  return diff.contains(input, cssString);
}

function parseOr(input, cssString) {
  const repl = replaceAll(cssString, ', ', ',');
  if (repl.indexOf(',') !== -1) {
    return diff.any(repl.split(','), (subCssString) => {
      return parseAnd(input, subCssString);
    });
  }
  return parseAnd(input, repl);
}

function select(input, cssString) {
  return parseOr(input, cssString);
}

function search(tree, keywords, selectors, searchFn) {
  if (!tree) {
    throw new Error('searching undefined for selectors');
  }
  if (!keywords || !selectors) {
    log.warn('searching tree without keywords or selectors string');
  }
  return searchFn(tree, keywords, selectors, [], 0);
}

export default {
  shallow(tree, keywords, selectors) {
    return flatten(search(tree, keywords, selectors, shallowSearch));
  },
  deep(tree, keywords, selectors) {
    return search(tree, keywords, selectors, deepSearch);
  },
  select
};
