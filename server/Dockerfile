FROM 1e1f/tmake
MAINTAINER chroma <leif@chroma.io>

ADD context/tmake.yaml /tmake_server/tmake.yaml
WORKDIR /tmake_server
RUN tmake all openssl
RUN tmake all mongo-cxx-driver
RUN tmake all re2
RUN tmake all served

ADD context/source /tmake_server/source
RUN tmake

ENTRYPOINT [ "/tmake_server/bin/tmake_server" ]
EXPOSE 8080
