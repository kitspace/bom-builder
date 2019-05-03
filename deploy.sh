#!/usr/bin/env bash
set -eu
cp .env.example .env
yarn build
mkdir -p deploy/bom-builder
mv build deploy/bom-builder/v1
echo '/ /bom-builder/v1/ 302' > deploy/_redirects
