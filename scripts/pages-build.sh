#!/usr/bin/env sh
set -eu

RPG_SHARED_REPO="${RPG_SHARED_REPO:-0biWanKenobi/rpg_shared}"
RPG_SHARED_RELEASE="${RPG_SHARED_RELEASE:-latest}"
CACHE_ROOT="${CF_PAGES_CACHE_DIR:-.cf-pages-cache}"
CACHE_DIR="$CACHE_ROOT/rpg_shared"
YALC_DIR=".yalc/rpg_shared"

apt-get update && apt-get install -y curl jq tar

mkdir -p "$CACHE_DIR" .yalc

if [ "$RPG_SHARED_RELEASE" = "latest" ]; then
  RELEASE_JSON="$(curl -fsSL "https://api.github.com/repos/$RPG_SHARED_REPO/releases/latest")"
  RELEASE_TAG="$(printf '%s' "$RELEASE_JSON" | jq -r '.tag_name')"
else
  case "$RPG_SHARED_RELEASE" in
    v*) RELEASE_TAG="$RPG_SHARED_RELEASE" ;;
    *) RELEASE_TAG="v$RPG_SHARED_RELEASE" ;;
  esac
  RELEASE_JSON="$(curl -fsSL "https://api.github.com/repos/$RPG_SHARED_REPO/releases/tags/$RELEASE_TAG")"
fi

ASSET_URL="$(
  printf '%s' "$RELEASE_JSON" |
    jq -r '.assets[] | select(.name | endswith(".tgz")) | .browser_download_url' |
    head -n 1
)"
test -n "$ASSET_URL" && test "$ASSET_URL" != "null"

ARCHIVE="$CACHE_DIR/$RELEASE_TAG.tgz"
if [ ! -f "$CACHE_DIR/version" ] || [ "$(cat "$CACHE_DIR/version")" != "$RELEASE_TAG" ] || [ ! -f "$ARCHIVE" ]; then
  rm -f "$CACHE_DIR"/*.tgz
  curl -fsSL "$ASSET_URL" -o "$ARCHIVE"
  printf '%s' "$RELEASE_TAG" > "$CACHE_DIR/version"
fi

rm -rf "$YALC_DIR"
mkdir -p "$YALC_DIR"
tar -xzf "$ARCHIVE" -C "$YALC_DIR" --strip-components=1

tmp_manifest="$(mktemp)"
jq 'del(.devDependencies, .engines)' "$YALC_DIR/package.json" > "$tmp_manifest"
mv "$tmp_manifest" "$YALC_DIR/package.json"

npm clean-install --progress=false
npm run build
