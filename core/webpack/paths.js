const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const paths = {
  root: ROOT_DIR,
  dev: path.join(ROOT_DIR, 'dist'),
  prod: path.join(ROOT_DIR, 'dist'),
  src: path.join(ROOT_DIR, 'src'),
  modules: path.join(ROOT_DIR, 'node_modules')
};

module.exports = paths;
