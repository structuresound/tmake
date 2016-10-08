base:
	cd docker/base && docker build -t 1e1f/tmake:base .

npm:
	grunt coffee
	npm publish

docker: base
	docker build -t 1e1f/tmake --no-cache .

server:
	cd server && docker build -t 1e1f/tmake:server .

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

.PHONY: npm base server dist all build test clean
