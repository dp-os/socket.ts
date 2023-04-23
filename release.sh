#!/bin/bash
rm -rf node_modules
pnpm install
pnpm coverage
pnpm build
npm publish --registry=https://registry.npmjs.org