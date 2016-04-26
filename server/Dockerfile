FROM 1e1f/tmake
MAINTAINER chroma <leif@chroma.io>

ADD context /served
RUN cd /served && tmake --verbose

CMD /served/example_served

EXPOSE 8080
