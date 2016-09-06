#include <served/served.hpp>

#include <bsoncxx/builder/stream/document.hpp>
#include <bsoncxx/json.hpp>

#include <mongocxx/client.hpp>
#include <mongocxx/options/find.hpp>
#include <mongocxx/instance.hpp>
#include <mongocxx/uri.hpp>


using bsoncxx::builder::stream::document;
using bsoncxx::builder::stream::open_document;
using bsoncxx::builder::stream::close_document;
using bsoncxx::builder::stream::open_array;
using bsoncxx::builder::stream::close_array;
using bsoncxx::builder::stream::finalize;

int insertTest() {
        mongocxx::instance inst {};
        mongocxx::client conn {mongocxx::uri {}};

        auto db = conn["test"];

        // TODO: fix dates

        // @begin: cpp-insert-a-document
        bsoncxx::document::value restaurant_doc =
                document {} << "address" << open_document << "street"
                            << "2 Avenue"
                            << "zipcode"
                            << "10075"
                            << "building"
                            << "1480"
                            << "coord" << open_array << -73.9557413 << 40.7720266 << close_array
                            << close_document << "borough"
                            << "Manhattan"
                            << "cuisine"
                            << "Italian"
                            << "grades" << open_array << open_document << "date"
                            << bsoncxx::types::b_date {12323} << "grade"
                            << "A"
                            << "score" << 11 << close_document << open_document << "date"
                            << bsoncxx::types::b_date {121212} << "grade"
                            << "B"
                            << "score" << 17 << close_document << close_array << "name"
                            << "Vella"
                            << "restaurant_id"
                            << "41704620" << finalize;

        // We choose to move in our document here, which transfers ownership to insert_one()
        auto res = db["restaurants"].insert_one(std::move(restaurant_doc));
        // @end: cpp-insert-a-document
        return res;
}

using bsoncxx::builder::stream::document;
using bsoncxx::builder::stream::open_document;
using bsoncxx::builder::stream::close_document;
using bsoncxx::builder::stream::open_array;
using bsoncxx::builder::stream::close_array;
using bsoncxx::builder::stream::finalize;

using namespace std;

int queryTest() {
        mongocxx::instance inst {};
        mongocxx::client conn {mongocxx::uri {}};

        auto db = conn["test"];

        // Query for all the documents in a collection.
        {
                // @begin: cpp-query-all
                auto cursor = db["restaurants"].find({});
                for (auto&& doc : cursor) {
                        std::cout << bsoncxx::to_json(doc) << std::endl;
                }
                // @end: cpp-query-all
        }

        // Query for equality on a top level field.
        {
                // @begin: cpp-query-top-level-field
                auto cursor = db["restaurants"].find(document {} << "borough"
                                                                 << "Manhattan" << finalize);

                for (auto&& doc : cursor) {
                        std::cout << bsoncxx::to_json(doc) << std::endl;
                }
                // @end: cpp-query-top-level-field
        }

        // Query by a field in an embedded document.
        {
                // @begin: cpp-query-embedded-document
                bsoncxx::builder::stream::document filter_builder;
                filter_builder << "address.zipcode"
                               << "10075";

                auto cursor = db["restaurants"].find(filter_builder.view());
                for (auto&& doc : cursor) {
                        std::cout << bsoncxx::to_json(doc) << std::endl;
                }
                // @end: cpp-query-embedded-document
        }

        // Query by a field in an array.
        {
                // @begin: cpp-query-field-in-array
                bsoncxx::builder::stream::document filter_builder;
                filter_builder << "grades.grade"
                               << "B";

                auto cursor = db["restaurants"].find(filter_builder.view());
                for (auto&& doc : cursor) {
                        std::cout << bsoncxx::to_json(doc) << std::endl;
                }
                // @end: cpp-query-field-in-array
        }

        // Query with the greater-than operator ($gt).
        {
                // @begin: cpp-query-greater-than
                bsoncxx::builder::stream::document filter_builder;
                filter_builder << "grades.score" << open_document << "$gt" << 30 << close_document;

                auto cursor = db["restaurants"].find(filter_builder.view());
                for (auto&& doc : cursor) {
                        std::cout << bsoncxx::to_json(doc) << std::endl;
                }
                // @end: cpp-query-greater-than
        }

        // Query with the less-than operator ($lt).
        {
                // @begin: cpp-query-less-than
                bsoncxx::builder::stream::document filter_builder;
                filter_builder << "grades.score" << open_document << "$lt" << 10 << close_document;

                auto cursor = db["restaurants"].find(filter_builder.view());
                for (auto&& doc : cursor) {
                        std::cout << bsoncxx::to_json(doc) << std::endl;
                }
                // @end: cpp-query-less-than
        }

        // Query with a logical conjunction (AND) of query conditions.
        {
                // @begin: cpp-query-logical-and
                bsoncxx::builder::stream::document filter_builder;
                filter_builder << "cuisine"
                               << "Italian"
                               << "address.zipcode"
                               << "10075";

                auto cursor = db["restaurants"].find(filter_builder.view());
                for (auto&& doc : cursor) {
                        std::cout << bsoncxx::to_json(doc) << std::endl;
                }
                // @end: cpp-query-logical-and
        }

        // Query with a logical disjunction (OR) of query conditions.
        {
                // @begin: cpp-query-logical-or
                bsoncxx::builder::stream::document filter_builder;
                filter_builder << "$or" << open_array << open_document << "cuisine"
                               << "Italian" << close_document << open_document << "address.zipcode"
                               << "10075" << close_document << close_array;

                auto cursor = db["restaurants"].find(filter_builder.view());
                for (auto&& doc : cursor) {
                        std::cout << bsoncxx::to_json(doc) << std::endl;
                }
                // @end: cpp-query-logical-or
        }

        // Sort query results.
        {
                // @begin: cpp-query-sort
                mongocxx::options::find opts;
                bsoncxx::builder::stream::document order_builder;
                order_builder << "borough" << 1 << "address.zipcode" << -1;
                opts.sort(order_builder.view());

                auto cursor = db["restaurants"].find({}, opts);
                for (auto&& doc : cursor) {
                        std::cout << bsoncxx::to_json(doc) << std::endl;
                }
                // @end: cpp-query-sort
        }
}

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

        insertTest();
        queryTest();

        // Create the server and run with 10 handler threads.
        served::net::server server("127.0.0.1", "8080", mux);
        server.run(10);

        return (EXIT_SUCCESS);
}
