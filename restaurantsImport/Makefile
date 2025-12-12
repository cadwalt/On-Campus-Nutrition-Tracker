.PHONY: help install import clean

help:
	@echo "🍴 Restaurant Import Makefile"
	@echo ""
	@echo "Available targets:"
	@echo "  make install    - Install dependencies (npm install)"
	@echo "  make import     - Run the import script (ts-node importRestaurants.ts)"
	@echo "  make build      - Compile TypeScript to JavaScript"
	@echo "  make run        - Run compiled JavaScript (requires build first)"
	@echo "  make clean      - Remove node_modules and compiled files"
	@echo ""
	@echo "Setup Instructions:"
	@echo "  1. Place your Firebase service account key at: firebase-credentials.json"
	@echo "  2. Run: make install"
	@echo "  3. Run: make import"
	@echo ""

install:
	npm install

import: install
	npx ts-node --compiler-options '{"target":"es2019","module":"commonjs","downlevelIteration":true}' importRestaurants.ts

build:
	tsc importRestaurants.ts --lib es2020 --module commonjs --target es2020 --resolveJsonModule --esModuleInterop

run: build
	node importRestaurants.js

clean:
	rm -rf node_modules/
	rm -f importRestaurants.js
	rm -f importRestaurants.js.map
	@echo "✅ Cleaned up node_modules and compiled files"
