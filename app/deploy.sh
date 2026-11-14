#!/bin/sh
# Rebuild the static site committed at the submodule root (the directory
# containing wizard.py), so the server can serve the checked-out submodule
# as a plain static site without any node/yarn toolchain.
#
# The previous build is deleted first: vite emits content-hashed filenames,
# so copying over it would leave stale bundles behind.
set -e
cd "$(dirname "$0")"

VITE_WSURL="wss://games.hameipe.de/wizard/api" yarn build

# Stamp the site with the source revision it was built from, so it is easy
# to tell whether the committed build matches the committed source.
git describe --always --dirty > dist/build-info

rm -rf ../index.html ../static ../assets ../asset-manifest.json
for f in public/*; do rm -rf "../$f"; done

cp -r dist/* ..
echo "Site deployed to $(cd .. && pwd)."
echo "Commit the wizard submodule, then update the pointer in the parent repo."
