_ = require 'underscore'
check = require './check'

isNumeric = (n) ->
  !isNaN(parseFloat(n)) and isFinite(n)

prune = (el) ->
  _.each el, (val, key) ->
    if Array.isArray(val)
      if val.length && !isEmpty(val)
        if prune val
          delete el[key]
      else
        delete el[key]
    else if (val != null and typeof val == 'object')
      if Object.keys(val).length && !isEmpty(val)
        if prune val
          delete el[key]
      else
        delete el[key]
  return isEmpty(el)

isEmpty = (el) ->
  containsValid = 0
  _.each el, (val) ->
    if val || isNumeric(val)
      containsValid = true
  return !containsValid

setValueForKeyPath = (value, keyPath, current) ->
  keys = keyPath.split('.')
  i = 0
  while i < keys.length - 1
    thisKey = keys[i]
    nextKey = keys[i+1]
    if nextKey
      if isNumeric(nextKey)
        if Array.isArray(current)
          unless Array.isArray(current[parseInt(thisKey, 10)])
            current[parseInt(thisKey, 10)] = []
        else
          unless Array.isArray(current[thisKey])
            current[thisKey] = []
      else
        if Array.isArray(current)
          unless (current[parseInt(thisKey, 10)] != null and typeof current[parseInt(thisKey, 10)] == 'object')
            current[parseInt(thisKey, 10)] = {}
        else
          unless (current[thisKey] != null and typeof current[thisKey] == 'object')
            current[thisKey] = {}
    if Array.isArray(current)
      current = current[parseInt(thisKey, 10)]
    else
      current = current[thisKey]
    i++
  lastKey = keys[keys.length - 1]
  if Array.isArray(current)
    current[parseInt(lastKey, 10)] = value
  else if (current != null and typeof current == 'object')
    current[lastKey] = value

unsetKeyPath = (keyPath, obj) ->
  keys = keyPath.split('.')
  i = 0
  current = obj
  while i < keys.length - 1
    key = keys[i]
    if Array.isArray(current)
      unless current[parseInt(key, 10)]
        return 0
      current = current[parseInt(key, 10)]
    else if (current != null and typeof current == 'object')
      unless current[key]
        return 0
      current = current[key]
    i++
  lastKey = keys[keys.length - 1]
  if Array.isArray(current)
    index = parseInt(lastKey, 10)
    if current[index] != undefined
      delete current[index]
      prune(obj)
      return 1
    return 0
  else
    if current[lastKey] != undefined
      delete current[lastKey]
      if Object.keys(current).length == 0
        prune(obj)
      return 1
    return 0

valueForKeyPath = (keyPath, current) ->
  return undefined unless current
  keys = keyPath.split('.')
  i = 0
  while i < keys.length - 1
    key = keys[i]
    if Array.isArray(current)
      unless current[parseInt(key, 10)]
        return undefined
      current = current[parseInt(key, 10)]
    else if (current != null and typeof current == 'object')
      unless current[key]
        return undefined
      current = current[key]
    i++
  lastKey = keys[keys.length - 1]
  if Array.isArray(current)
    return current[parseInt(lastKey, 10)]
  else
    return current[lastKey]

keyPaths = (obj, stack, parent, allLevels) ->
  # returns an array '.' separated strings for keys + nested keys present in object
  stack = stack or []
  keys = Object.keys(obj)
  keys.forEach (el) ->
    #if it's a nested object
    if Array.isArray(obj[el])
      if allLevels
        stack.push if parent then parent + '.' + el else el
      i = 0
      while i < obj[el].length
        if parent
          p = parent + '.' + el + ".#{i}"
        else
          p = el + ".#{i}"
        s = obj[el][i]
        if Array.isArray(s) || (s != null and typeof s == 'object')
          keyPaths s, stack, p
        else
          stack.push p
        i++
    else if obj[el] instanceof Date
      key = if parent then parent + '.' + el else el
      stack.push key
    else if (obj[el] != null and typeof obj[el] == 'object')
      if allLevels
        stack.push if parent then parent + '.' + el else el
      p = if parent then parent + '.' + el else el
      keyPaths obj[el], stack, p
    else
      stack.push if parent then parent + '.' + el else el
    return
  stack

validateSelector = (val, key, test) ->
  return false unless check val, Object
  return false unless test val, key
  true

shallowSearch = (current, selectors, test, stack, height) ->
  stack[height] ?= {}
  for prop of current
    if _.contains selectors, prop
      if validateSelector current[prop], prop, test
        shallowSearch current[prop], selectors, test, stack, height + 1
    else
      stack[height][prop] = current[prop]
  stack

flatten = (stack) ->
  flat = {}
  for level of stack
    _.extend flat, stack[level]
  flat

deepSearch = (object, selectors, test) ->
  keys = keyPaths object
  stack = []
  _.each keys, (key) ->
    priority = 0;
    filtered = key
    unfiltered = key.split '.'
    valid = true
    _.each unfiltered, (kp) ->
      if _.contains selectors, kp
        if test 0, kp
          priority += 1
          filtered = filtered.replace "#{kp}.", ''
          filtered = filtered.replace ".#{kp}", ''
        else valid = false
    if valid
      stack[priority] ?= {}
      stack[priority][filtered] = valueForKeyPath key, object
  flat = {}
  _.each stack, (level) ->
    _.each level, (v, k) ->
      setValueForKeyPath v, k, flat
  flat

module.exports =
  deep: (tree, selectors, testOrValidSelectors) ->
    test = testOrValidSelectors
    if testOrValidSelectors
      unless check testOrValidSelectors, Function
        test = (val, key) -> _.contains testOrValidSelectors, key
    else test = -> true
    deepSearch(tree, selectors, test)

  shallow: (tree, selectors, testOrValidSelectors) ->
    test = testOrValidSelectors
    if testOrValidSelectors
      unless check testOrValidSelectors, Function
        test = (val, key) -> _.contains testOrValidSelectors, key
    else test = -> true
    flatten shallowSearch(tree, selectors, test, [], 0)
