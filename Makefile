dockerBase:
	cd docker/base && docker build -t 1e1f/tmake:base .

tmake:
	cd src && yarn
	cd src/core && npm run distribute && npm link
	cd src/cmake && npm run distribute  && npm link
	cd src/make && npm run distribute && npm link
	cd src/cli && npm run distribute && npm link

test: tmake
	mkdir -p tests/.tmake/plugins
	touch tests/.tmake/plugins/package.json
	cd tests/.tmake/plugins && npm link tmake-plugin-cmake
	cd tests/.tmake/plugins && npm link tmake-plugin-make
	cd tests && npm run before && npm test

coverage: tmake
	cd tests && npm run before && npm run cover

travis: coverage

docker: clean
	rm -Rf tests/.tmake
	docker build -t 1e1f/tmake .

docker-clean:
	docker rmi 1e1f/tmake:server
	docker rmi 1e1f/tmake
	docker rmi 1e1f/tmake:base

server:
	cd server/project && docker build -t 1e1f/tmake:server .

run:
	cd server && docker compose up

clean:
	rm -Rf **/node_modules
	rm -Rf **/**/node_modules
	rm -Rf **/**/**/node_modules
	rm -Rf server/data

install:
	docker push 1e1f/tmake:base
	docker push 1e1f/tmake
	docker push 1e1f/tmake:server

.PHONY: dockerBase docker server dist all build test clean
