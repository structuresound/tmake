declare interface Args {
  runDir: string;
  npmDir: string;
  binDir: string;
  libDir: string;
  cachePath: string;
  compiler: string;
  program: string;
  verbose: boolean;
  quiet: boolean;
  nodeps: boolean;
  f: string;
  force: string;
  v: boolean;
  y: boolean;
  yes: boolean;
  test: boolean;
  userCache: string;
  _: string[];
}