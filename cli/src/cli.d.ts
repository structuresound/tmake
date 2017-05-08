interface Command {
  name?: string;
  type?: string[];
  typeName?: string;
  description?: any;
}

interface PackageCommands {
  ls: Command;
  install: Command;
  all: Command;
  fetch: Command;
  configure: Command;
  build: Command;
  push: Command;
  link: Command;
  unlink: Command;
  parse: Command;
  rm: Command;
  test: Command;
  clean: Command;
  graph: Command;
}

interface GlobalCommands {
  [index: string]: Command;

  example: Command;
  init: Command;
  help: Command;
  reset: Command;
  nuke: Command;
  version: Command;
}


interface Commands extends PackageCommands, GlobalCommands {
}