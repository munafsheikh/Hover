#!/usr/bin/env bash
set -e

rm -rf node_modules dist
npm ci
npm run lint || true
npm run dev
