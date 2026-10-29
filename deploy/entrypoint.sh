#!/bin/sh
set -eu

umask 077
mkdir -p /data/secrets /data/artifacts /workspaces

generate_master_key() {
  file=/data/secrets/master.key
  if [ ! -s "$file" ]; then
    node -e 'const { randomBytes } = require("node:crypto"); process.stdout.write(randomBytes(32));' > "$file"
  fi
  chmod 600 "$file"
}

generate_setup_token() {
  file=/data/secrets/setup-token
  if [ ! -s "$file" ]; then
    node -e 'const { randomBytes } = require("node:crypto"); process.stdout.write(randomBytes(32).toString("base64url"));' > "$file"
  fi
  chmod 600 "$file"
}

generate_master_key
generate_setup_token

if [ "$(id -u)" = "0" ]; then
  chown node:node \
    /data \
    /data/secrets \
    /data/artifacts \
    /workspaces \
    /data/secrets/master.key \
    /data/secrets/setup-token
  exec su-exec node "$@"
fi

exec "$@"
