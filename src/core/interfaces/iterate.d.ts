declare namespace TMake {
  class OLHV<T> {
    require?: string;
    value: T
  }
  class OLHM<T> {
    [index: string]: OLHV<T>;
  }

  interface CmdObj {
    cmd: string;
    cwd?: string;
    arg?: any;
  }
}
