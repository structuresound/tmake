import check from '../util/check';

export default function(val) {
  if (check(val, Array)) { return val;
  } else { return [ val ]; }
};
