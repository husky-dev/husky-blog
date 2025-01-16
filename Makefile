default: build-deploy

build: FORCE
	hugo --minify

deploy: FORCE
	cp _redirects public/
	wrangler pages deploy public --project-name=husky-blog --branch=main --commit-dirty

build-deploy: build deploy

FORCE: ;
