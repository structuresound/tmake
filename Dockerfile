FROM 1e1f/tmake:base
MAINTAINER chroma <leif@chroma.io>

RUN apt-get install -y runit apt-transport-https
RUN curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -
RUN echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list
RUN apt-get update && apt-get install -y yarn

RUN npm i -g mocha

COPY docker/image/ /
COPY package.json /tmake/
COPY yarn.lock /tmake/

ENV HOME /tmake
WORKDIR /tmake
RUN yarn install --production

COPY bin/ /tmake/bin/
COPY src/ /tmake/src/
COPY lib/ /tmake/lib/
COPY test/ /tmake/test/

RUN NODE_ENV=test mocha --require source-map-support/register test/
RUN npm link

WORKDIR /tmake/build
ENTRYPOINT [ "/tmake/entrypoint.sh" ]
