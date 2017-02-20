function startsWith(string: string, s: string) {
  return string.slice(0, s.length) === s;
}

function beginsWith(string: string, s: string) {
  return string.slice(0, s.length) === s;
}

function endsWith(string: string, s: string) {
  return s === '' || string.slice(-s.length) === s;
}

function replaceAll(str: string, find: string, rep: string) {
  const escaped = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return str.replace(new RegExp(escaped, 'g'), rep);
}

export {
  startsWith,
  beginsWith,
  endsWith,
  replaceAll
};
