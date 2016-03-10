#include <served/served.hpp>

using namespace std;

int main(int argc, char const* argv[]) {
    // Create a multiplexer for handling requests
    served::multiplexer mux;

    cout << "I'm a simple server rest server" << endl;
    cout << "curl http://127.0.0.1:8080/hello" << endl;
    cout << "to talk to me" << endl;
    // GET /hello
    mux.handle("/hello")
    .get([](served::response & res, const served::request & req) {
        res << "That was easy wasn't it !\n";
    });

    // Create the server and run with 10 handler threads.
    served::net::server server("127.0.0.1", "8080", mux);
    server.run(10);

    return (EXIT_SUCCESS);
}
