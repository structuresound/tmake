FROM 1e1f/tmake
MAINTAINER chroma <leif@chroma.io>

ADD . /tmake
WORKDIR tmake
RUN tmake

ENTRYPOINT [ "/tmake/bin/tmake_server" ]
EXPOSE 8080