default: build-deploy

build: FORCE
	hugo --minify

deploy: FORCE
	rsync -avz --delete ./public/ husky-api:/srv/data/blog

build-deploy: build deploy

FORCE: ;
