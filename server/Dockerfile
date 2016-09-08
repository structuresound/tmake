FROM 1e1f/tmake
MAINTAINER chroma <leif@chroma.io>

ADD context/package.cson /tmake/package.cson
WORKDIR /tmake
RUN tmake all openssl
RUN tmake all mongo-cxx-driver
RUN tmake all re2
RUN tmake all served

ADD context/source /tmake/source
RUN tmake --verbose

CMD /tmake/tmake_server

EXPOSE 8080
