if (!shell.which("git")) {
    shell.echo("Sorry, this script requires git");
    shell.exit(1);
}
shell.mkdir("-p", "out/Release");
shell.cp("-R", "stuff/*", "out/Release");
shell.cd("lib");
shell.ls("*.js").forEach(file => {
    shell.sed("-i", "BUILD_VERSION", "v0.1.2", file);
    shell.sed("-i", /.*REMOVE_THIS_LINE.*\n/, "", file);
    shell.sed("-i", /.*REPLACE_LINE_WITH_MACRO.*\n/, shell.cat("macro.js"), file);
});
shell.cd("..");
if (shell.exec('git commit -am "Auto-commit"').code !== 0) {
    shell.echo("Error: Git commit failed");
    shell.exit(1);
}
shell.ls("projs/*.js");
shell.ls("-R", "/users/me", "/tmp");
shell.ls("-R", ["/users/me", "/tmp"]);
shell.find("src", "lib");
shell.find(["src", "lib"]);
shell.find(".").filter((file, i, n) => !!file.match(/\.js$/));
shell.cp("file1", "dir1");
shell.cp("-Rf", ["/tmp/*", "/usr/local/*"], "/home/tmp");
shell.rm("-rf", "/tmp/*");
shell.rm("some_file.txt", "another_file.txt");
shell.rm(["some_file.txt", "another_file.txt"]);
shell.mv(["file1", "file2"], "dir/");
shell.mkdir("-p", "/tmp/a/b/c/d", "/tmp/e/f/g");
shell.mkdir("-p", ["/tmp/a/b/c/d", "/tmp/e/f/g"]);
if (shell.test("-d", "/tmp/a/b/c/d")) { }
if (!shell.test("-f", "/tmp/a/b/c/d")) { }
var str = shell.cat("file*.txt");
str = shell.cat("file1", "file2");
str = shell.cat(["file1", "file2"]);
shell.sed("-i", "PROGRAM_VERSION", "v0.1.3", "source.js");
shell.sed(/.*DELETE_THIS_LINE.*\n/, "", "source.js");
shell.grep("-v", "GLOBAL_VARIABLE", "*.js");
shell.grep("GLOBAL_VARIABLE", "*.js");
var nodeExec = shell.which("node");
shell.pushd("/etc");
shell.pushd("+1");
shell.echo(process.cwd());
shell.pushd("/etc");
shell.echo(process.cwd());
shell.popd();
shell.echo(process.cwd());
shell.ln("file", "newlink");
shell.ln("-sf", "file", "existing");
var testPath = shell.env["path"];
var version = shell.exec("node --version").output;
var version2 = shell.exec("node --version", { async: false });
var output = version2.output;
var asyncVersion3 = shell.exec("node --version", { async: true });
var pid = asyncVersion3.pid;
shell.exec("node --version", { silent: true }, function (code, output) {
    var version = output;
});
shell.exec("node --version", { silent: true, async: true }, function (code, output) {
    var version = output;
});
shell.exec("node --version", function (code, output) {
    var version = output;
});
shell.exec("node --version", function (code) {
    var num = code;
});
var childProc = shell.exec("node --version", function (code) {
    var num = code;
});
var pid = childProc.pid;
shell.chmod(755, "/Users/brandon");
shell.chmod("755", "/Users/brandon");
shell.chmod("u+x", "/Users/brandon");
shell.exit(0);
shell.touch('/Users/brandom/test1');
shell.touch('/Users/brandom/test1', '/Users/brandom/test2');
shell.touch(['/Users/brandom/test1']);
shell.touch(['/Users/brandom/test1', '/Users/brandom/test2']);
shell.touch('-c', '/Users/brandom/test1');
shell.touch('-c', '/Users/brandom/test1', '/Users/brandom/test2');
shell.touch('-c', ['/Users/brandom/test1', '/Users/brandom/test2']);
shell.touch({ '-r': '/some/file.txt' }, '/Users/brandom/test1');
shell.touch({ '-r': '/some/file.txt' }, '/Users/brandom/test1', '/Users/brandom/test2');
shell.touch({ '-r': '/oome/file.txt' }, ['/Users/brandom/test1', '/Users/brandom/test2']);
var tmp = shell.tempdir();
var errorlol = shell.error();
shell.config.fatal = true;
shell.config.silent = true;
//# sourceMappingURL=shelljs-tests.js.map