dockerBase:
	cd docker/base && docker build -t 1e1f/tmake:base .

tmake:
	grunt build
docker: tmake
	docker build -t 1e1f/tmake .

server:
	cd server/project && docker build -t 1e1f/tmake:server .

run:
	cd server && docker compose up

clean:
	docker rmi 1e1f/tmake:server
	docker rmi 1e1f/tmake
	docker rmi 1e1f/tmake:base

install:
	docker push 1e1f/tmake:base
	docker push 1e1f/tmake
	docker push 1e1f/tmake:server

.PHONY: dockerBase docker server dist all build test clean
