# syntax=docker/dockerfile:1.7

FROM alpine:3.22 AS rpg_shared
ARG RPG_SHARED_REPO=0biWanKenobi/rpg_shared
ARG RPG_SHARED_RELEASE=latest
WORKDIR /opt/rpg_shared
RUN apk add --no-cache curl jq tar
RUN --mount=type=cache,target=/var/cache/rpg_shared,sharing=locked \
    set -eux; \
    cache_dir=/var/cache/rpg_shared; \
    release_ref="$RPG_SHARED_RELEASE"; \
    if [ "$release_ref" = "latest" ]; then \
      release_json=$(curl -fsSL "https://api.github.com/repos/$RPG_SHARED_REPO/releases/latest"); \
      release_tag=$(printf '%s' "$release_json" | jq -r '.tag_name'); \
    else \
      case "$release_ref" in \
        v*) release_tag="$release_ref" ;; \
        *) release_tag="v$release_ref" ;; \
      esac; \
      release_json=$(curl -fsSL "https://api.github.com/repos/$RPG_SHARED_REPO/releases/tags/$release_tag"); \
    fi; \
    asset_url=$(printf '%s' "$release_json" | jq -r '.assets[] | select(.name | endswith(".tgz")) | .browser_download_url' | head -n 1); \
    test -n "$asset_url" && test "$asset_url" != "null"; \
    cache_archive="$cache_dir/${release_tag}.tgz"; \
    if [ -f "$cache_dir/version" ] && [ "$(cat "$cache_dir/version")" = "$release_tag" ] && [ -f "$cache_archive" ]; then \
      echo "Reusing cached rpg_shared $release_tag"; \
    else \
      echo "Downloading rpg_shared $release_tag"; \
      rm -f "$cache_dir"/*.tgz; \
      curl -fsSL "$asset_url" -o "$cache_archive"; \
      printf '%s' "$release_tag" > "$cache_dir/version"; \
    fi; \
    rm -rf package; \
    mkdir -p package; \
    tar -xzf "$cache_archive" -C package --strip-components=1; \
    tmp_manifest=$(mktemp); \
    jq "del(.devDependencies, .engines)" package/package.json > "$tmp_manifest"; \
    mv "$tmp_manifest" package/package.json

FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
COPY yalc.lock ./
COPY --from=rpg_shared /opt/rpg_shared/package ./.yalc/rpg_shared
RUN npm ci

ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_GOOGLE_DRIVE_SCOPE
ARG VITE_GOOGLE_REDIRECT_URI

ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_DRIVE_SCOPE=$VITE_GOOGLE_DRIVE_SCOPE
ENV VITE_GOOGLE_REDIRECT_URI=$VITE_GOOGLE_REDIRECT_URI

COPY . .
RUN npm run build

FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
