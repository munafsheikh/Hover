#!/usr/bin/env bash
set -e

rm -rf node_modules dist
npm ci
npm run type-check || true
npm run lint || true
npm run dev
