default: build-deploy

build: FORCE
	hugo --minify

deploy: FORCE
	wrangler pages deploy public --project-name=husky-blog --branch=main --commit-dirty

build-deploy: build deploy

FORCE: ;
