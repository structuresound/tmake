function startsWith(string, s) {
  return string.slice(0, s.length) === s;
}

function beginsWith(string, s) {
  return string.slice(0, s.length) === s;
}

function endsWith(string, s) {
  return s === '' || string.slice(-s.length) === s;
}

export {
  startsWith,
  beginsWith,
  endsWith
};
