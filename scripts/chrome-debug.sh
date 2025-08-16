#!/usr/bin/env bash

google-chrome \
  --remote-debugging-port=9222 \
  --load-extension="$(pwd)/dist" \
  --user-data-dir="$(pwd)/.chrome-dev-profile"
