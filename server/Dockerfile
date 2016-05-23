FROM 1e1f/tmake
MAINTAINER chroma <leif@chroma.io>

ADD context /served
WORKDIR /served
RUN tmake all mongo-cxx-driver
RUN tmake all re2
RUN tmake all served
RUN tmake --verbose

CMD /served/example_served

EXPOSE 8080
