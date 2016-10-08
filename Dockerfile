FROM 1e1f/tmake:base
MAINTAINER chroma <leif@chroma.io>

RUN apt-get install -y runit

COPY docker/image/ /

ENV HOME /tmake
WORKDIR /tmake

COPY package.json /tmake/
RUN npm i
RUN npm i -g grunt

COPY bin/ /tmake/bin/
RUN npm link

COPY examples/ /tmake/examples/
COPY src/ /tmake/src/

COPY Gruntfile.coffee /tmake/Gruntfile.coffee
RUN grunt test

WORKDIR /build
ENTRYPOINT [ "/tmake/entrypoint.sh" ]
