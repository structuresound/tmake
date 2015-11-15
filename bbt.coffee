author: "leif"
name: "bbt"
version: "0.1.0"
deps:
  [
    name: "bbt"
    git:
      url: "https://github.com/structuresound/bbt.git"
      config:
        user: "leif@structuresound"
        password: ""
        rsa: ""
      version: "0.1.0"
    move:
      "**/*.{h}": dest: "include"
  ,
    name: "bbt"
    bbt:
      user: "leif"
      version: "0.1.0"
  ]
