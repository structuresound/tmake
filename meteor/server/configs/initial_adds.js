import {
  Packages
} from '/lib/collections';

export default function() {
  if (!Packages.findOne()) {
    Packages.insert({
      name: "re2",
      git: "google/re2",
      build: {
        "with": "cmake",
        sources: {
          matching: ["re2/*.cc", "util/*.cc"]
        },
        linux: {
          sources: {
            matching: ["!util/threadwin.cc"]
          }
        },
        mac: {
          sources: {
            matching: ["!util/threadwin.cc"]
          }
        },
        target: "static",
        cflags: {
          O3: 1,
          std: "c++11",
          g: 1,
          pthread: 1,
          Wall: 1,
          Wextra: 1,
          "Wno-unused-parameter": 1,
          "Wno-missing-field-initializers": 1
        }
      }
    });
  }
}
