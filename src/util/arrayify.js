import {check} from '1e1f-tools';

export default function(val) {
  if (check(val, Array)) { return val;
  } else { return [ val ]; }
};
