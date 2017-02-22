import * as _ from 'lodash';
import { check, every, any, contains, valueForKeyPath, mergeValueAtKeypath, keyPaths } from 'js-object-tools';
import { replaceAll } from './string';
import { log } from './log';
import { startsWith } from './string';

function deepSearch(object: any, keywords: string[], selectors: string[], stack: any) {
  for (const key of keyPaths(object)) {
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
      const val = valueForKeyPath(key, object);
      stack[priority][filtered] = val;
    }
  }
  const flat = {};
  _.each(stack, (priority) => {
    _.each(priority, (v, k) => { mergeValueAtKeypath(v, k, flat); });
  });
  return flat;
}

function shallowSearch(current: any, keywords: string[], selectors: string[], stack: any[], height?: number) {
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
        stack[height][key] =
          flatten(shallowSearch(current[key], keywords, selectors, [], 0));
      } else {
        stack[height][key] = current[key];
      }
    }
  }
  return stack;
}

function flatten(stack: any) {
  const flat = {};
  for (const level of Object.keys(stack)) {
    _.extend(flat, stack[level]);
  }
  return flat;
}

function parseAnd(input: string[], cssString: string): boolean {
  if (cssString.indexOf(' ') !== -1) {
    return every(cssString.split(' '), (subCssString) => {
      if (startsWith(subCssString, '!')) {
        return !contains(input, subCssString);
      } else {
        return contains(input, subCssString);
      }
    });
  }
  return contains(input, cssString);
}

function parseOr(input: string[], cssString: string): boolean {
  const repl = replaceAll(cssString, ', ', ',');
  if (repl.indexOf(',') !== -1) {
    return any(repl.split(','), (subCssString) => {
      return parseAnd(input, subCssString);
    });
  }
  return parseAnd(input, repl);
}

export function select(input: string[], cssString: string): boolean {
  return parseOr(input, cssString);
}

function search(tree: any, keywords: string[], selectors: string[], searchFn: Function) {
  if (!tree) {
    throw new Error('searching undefined for selectors');
  }
  if (!keywords || !selectors) {
    log.warn('searching tree without keywords or selectors string');
  }
  return searchFn(tree, keywords, selectors, [], 0);
}

export function cascadeShallow(tree: any, keywords: string[], selectors: string[]) {
  return flatten(search(tree, keywords, selectors, shallowSearch));
}

export function cascade(tree: any, keywords: string[], selectors: string[]) {
  return search(tree, keywords, selectors, deepSearch);
}