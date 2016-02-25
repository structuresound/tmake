import {packages} from '/lib/collections';

export default function () {
  if (!packages.findOne()) {
    for (let lc = 1; lc <= 5; lc++) {
      const title = `re2`;
      const content = `
      name: "re2"
      git: "google/re2"
      build:
        with: "ninja"
        target: "static"
        sources: ["re2/*.cc"]
        headers: ["re2/*.h"]
        cflags:
          O3: 1
          std: "c++11"
          g: 1
          pthread: 1
          Wall: 1
          Wextra: 1
          "Wno-unused-parameter": 1
          "Wno-missing-field-initializers": 1`;
      packages.insert({title, content});
    }
  }
}
