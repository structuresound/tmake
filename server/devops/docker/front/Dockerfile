FROM chromapdx/node:7
LABEL name="front"

COPY ./package.json /app/package.json
WORKDIR /app
RUN yarn --production

COPY ./build /app/build
EXPOSE 3000

WORKDIR /app/build
CMD ["node", "server.js"] # run the index.js file