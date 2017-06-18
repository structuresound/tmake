import { cascade, check, each, clone, union, contains, map, arrayify, combine, combineN, extend, plain as toJSON, OLHM } from 'typed-json-transform';

import { interpolate } from './interpolate';

namespace Moss {
  class Parser {
    keywords?: string[]
    selectors?: string[]
    options?: {}
  }

  interface Layer {
    options?: any;
  }

  function addOptions(options: any, parser: Parser) {
    const flatOptions = cascade(options || {}, parser.keywords, parser.selectors);
    const keywords = Object.keys(flatOptions);

    const validOptions = [];
    each(flatOptions, (opt, key) => {
      (opt === 1) && validOptions.push(key);
    });
    parser.keywords = union(parser.keywords, keywords);
    parser.selectors = union(parser.keywords, validOptions);
  }

  function parseLayer(parser: Parser, layer: any) {
    addOptions(this.options, parser);
    each(layer, (val, key) => {
      if (!contains(parser.keywords, key)) {
        layer = parseLayer(clone(parser), val);
      }
    });
    const flat = cascade(layer || {}, parser.keywords, parser.selectors);
  }

  function parseTrie(baseParser: Parser, trunk: any = {}) {
    parseLayer(baseParser, trunk);
  }
}