#!/usr/bin/env bash
set -e

npm run type-check
npm run lint
npm test
