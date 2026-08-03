#!/bin/bash
# Launches Aleksandar Portfolio: builds + serves the production bundle on a
# fixed port (if not already running) and opens it in the default browser.
# Called by "Aleksandar Portfolio.app" — absolute paths because the .app
# environment doesn't inherit the shell's PATH.
cd "$(dirname "$0")" || exit 1
export PATH="/usr/local/bin:$PATH"
NODE=/usr/local/bin/node
# 5173 on purpose: the user's saved portfolio (localStorage) lives under this
# origin from the app's dev-server days. Changing the port would orphan it.
PORT=5173
URL="http://localhost:$PORT"

if ! curl -s --max-time 1 -o /dev/null "$URL"; then
  "$NODE" node_modules/vite/bin/vite.js build >/dev/null 2>&1
  nohup "$NODE" node_modules/vite/bin/vite.js preview --port "$PORT" --strictPort \
    >/dev/null 2>&1 &
  disown
  for _ in $(seq 1 50); do
    curl -s --max-time 1 -o /dev/null "$URL" && break
    sleep 0.2
  done
fi

open "$URL"
