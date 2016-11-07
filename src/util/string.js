function startsWith(string, s) {
  return string.slice(0, s.length) === s;
}

function beginsWith(string, s) {
  return string.slice(0, s.length) === s;
}

function endsWith(string, s) {
  return s === '' || string.slice(-s.length) === s;
}

function replaceAll(str, find, rep) {
  const escaped = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return str.replace(new RegExp(escaped, 'g'), rep);
}

export {
  startsWith,
  beginsWith,
  endsWith,
  replaceAll
};
