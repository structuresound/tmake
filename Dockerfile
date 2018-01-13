FROM 1e1f/tmake:base
MAINTAINER chroma <structuresound@gmail.com>


ENV YARN_VERSION 0.21.3
ADD https://yarnpkg.com/downloads/$YARN_VERSION/yarn-v${YARN_VERSION}.tar.gz /opt/yarn.tar.gz
RUN yarnDirectory=/opt/yarn && \
    mkdir -p "$yarnDirectory" && \
    tar -xzf /opt/yarn.tar.gz -C "$yarnDirectory" && \
    ln -s "$yarnDirectory/dist/bin/yarn" /usr/local/bin/ && \
    rm /opt/yarn.tar.gz

RUN npm i -g mocha

COPY docker/image/ /
COPY package.json /tmake/
COPY Makefile /tmake/
COPY bin/ /tmake/bin/
COPY settings/ /tmake/settings/
COPY src/ /tmake/src/
COPY tests/src /tmake/tests/src
COPY tests/package.json /tmake/tests/package.json

ENV HOME /tmake
WORKDIR /tmake

RUN make test
RUN npm link

ENTRYPOINT [ "/tmake/entrypoint.sh" ]
