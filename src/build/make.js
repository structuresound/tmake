import Promise from 'bluebird';
import sh from "../util/sh";

const build = () => sh.Promise(`make -j${platform.j()}`, dep.d.project, !argv.quiet);

export default {
  build,
  generate() {
    return Promise.resolve("sorry, no support for Makefile creation yet - use cmake or ninja instead");
  },
  install() {
    return sh.Promise("make install", dep.d.project, !argv.quiet);
  }
};
