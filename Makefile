# Makefile for MiniCloud

.PHONY: build test lint fmt start-cp start-dp

build:
	npm run build

test:
	npm test

lint:
	npm run lint

fmt:
	npm run fmt

start-cp:
	npm run start:controlplane

start-dp:
	npm run start:dataplane
