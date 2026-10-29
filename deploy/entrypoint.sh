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

# First boot only. After the owner claims the instance, the app deletes the
# setup token; the marker stops a restart from creating a fresh one.
if [ ! -f /data/.initialized ]; then
  generate_master_key
  generate_setup_token
  touch /data/.initialized
fi

if [ "$(id -u)" = "0" ]; then
  chown node:node /data /data/secrets /data/artifacts /workspaces

  for file in /data/secrets/master.key /data/secrets/setup-token /data/.initialized; do
    if [ -e "$file" ]; then
      chown node:node "$file"
    fi
  done

  exec su-exec node "$@"
fi

exec "$@"
