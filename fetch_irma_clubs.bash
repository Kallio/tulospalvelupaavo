#!/bin/bash

# This script downloads the public club list page, extracts a CSRF token (trying grep -P first, falling back to awk if grep -P isn't available), 
# preserves cookies for the session, then POSTs to the ClubEndpoint/list API and prints the returned JSON to stdout.
# No persistent cache or files  are left behind.


set -euo pipefail

initial_url="https://irma.suunnistusliitto.fi/public/club/list"
api_url="https://irma.suunnistusliitto.fi/connect/ClubEndpoint/list"
cookies_file="$(mktemp)"
tmp_html="$(mktemp)"

trap 'rm -f "$cookies_file" "$tmp_html"' EXIT

# Download the page (store cookies + HTML)
curl -s -L -c "$cookies_file" -b "$cookies_file" "$initial_url" -o "$tmp_html"

# Function: extract token — try grep -P first, fallback to awk
extract_token() {
  local file="$1"
  local token

  # Attempt grep -P; suppress errors. If grep doesn't support -P, this will fail and token remains empty.
  token="$(grep -oP 'name="_csrf" content="\K[^"]+' "$file" 2>/dev/null || true)"
  if [ -z "$token" ]; then
    # Fallback: use awk to extract token from an input element
    token="$(awk '{
      if (match($0, /name="_csrf" content="[^"]+"/)) {
        s = substr($0, RSTART, RLENGTH)
        sub(/.*content="/, "", s)
        sub(/".*/, "", s)
        print s
        exit
      }
    }' "$file" || true)"
  fi

  # Fallback to alternative token name if still empty
  if [ -z "$token" ]; then
    token="$(grep -oP 'name="csrf-token" content="\K[^"]+' "$file" 2>/dev/null || true)"
  fi
  if [ -z "$token" ]; then
    token="$(awk '{
      if (match($0, /name="csrf-token" content="[^"]+"/)) {
        s = substr($0, RSTART, RLENGTH)
        sub(/.*content="/, "", s)
        sub(/".*/, "", s)
        print s
        exit
      }
    }' "$file" || true)"
  fi

  printf '%s' "$token"
}

csrf_token="$(extract_token "$tmp_html")"

if [ -z "$csrf_token" ]; then
  echo "ERROR: CSRF token not found" >&2
  exit 1
fi

# Perform POST and print JSON to stdout
curl -s --compressed -X POST "$api_url" \
  -H 'Accept: application/json' \
  -H 'Content-Type: application/json' \
  -H "Referer: $initial_url" \
  -H "Origin: https://irma.suunnistusliitto.fi" \
  -H "X-CSRF-TOKEN: $csrf_token" \
  -b "$cookies_file" \
  --data-raw '{}'
