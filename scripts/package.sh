#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Cloudflare CLI Packaging Script (DMG & Tarball Package)
# ==============================================================================

VERSION=$(node -p "require('./package.json').version")
APP_NAME="cloudflare-cli"
BUILD_DIR="build_artifacts"
STAGING_DIR="${BUILD_DIR}/staging"
DMG_NAME="${APP_NAME}-v${VERSION}-macos.dmg"
TAR_NAME="${APP_NAME}-v${VERSION}-package.tar.gz"

echo "==> Building ${APP_NAME} v${VERSION}..."

# 1. Clean previous build artifacts
rm -rf "${BUILD_DIR}"
mkdir -p "${STAGING_DIR}/${APP_NAME}"

# 2. Compile TypeScript
npm run build

# 3. Pack npm package (.tgz)
echo "==> Generating npm distribution package (.tgz)..."
npm pack --pack-destination="${BUILD_DIR}"

# 4. Prepare Staging Directory for Standalone Package & DMG
echo "==> Staging files for standalone package..."
cp -r dist "${STAGING_DIR}/${APP_NAME}/"
cp package.json package-lock.json README.md LICENSE "${STAGING_DIR}/${APP_NAME}/"

# Install production dependencies inside staging
(cd "${STAGING_DIR}/${APP_NAME}" && npm ci --omit=dev --silent)

# Create launcher binary wrapper
cat << 'EOF' > "${STAGING_DIR}/${APP_NAME}/cloudflare-cli"
#!/usr/bin/env bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec node "${DIR}/dist/index.js" "$@"
EOF
chmod +x "${STAGING_DIR}/${APP_NAME}/cloudflare-cli"

# Create symlink for cf-cli
ln -sf "cloudflare-cli" "${STAGING_DIR}/${APP_NAME}/cf-cli"

# Create installer script for macOS/Linux
cat << 'EOF' > "${STAGING_DIR}/install.sh"
#!/usr/bin/env bash
set -e
INSTALL_DIR="/usr/local/lib/cloudflare-cli"
BIN_DIR="/usr/local/bin"

echo "Installing Cloudflare CLI..."
sudo mkdir -p "${INSTALL_DIR}" "${BIN_DIR}"
sudo cp -R cloudflare-cli/* "${INSTALL_DIR}/"
sudo ln -sf "${INSTALL_DIR}/cloudflare-cli" "${BIN_DIR}/cloudflare-cli"
sudo ln -sf "${INSTALL_DIR}/cf-cli" "${BIN_DIR}/cf-cli"

echo "✔ Cloudflare CLI successfully installed to ${BIN_DIR}/cloudflare-cli"
echo "Run 'cloudflare-cli --help' to get started."
EOF
chmod +x "${STAGING_DIR}/install.sh"

# Add README for DMG / Package users
cat << EOF > "${STAGING_DIR}/README.txt"
Cloudflare CLI (cf-cli) v${VERSION}
===================================

Installation:
1. Double-click or run ./install.sh from Terminal.
   OR
2. Copy the 'cloudflare-cli' folder to your desired path and add it to your PATH.

Usage:
  cloudflare-cli --help
  cloudflare-cli --local user:display

License: MIT
EOF

# 5. Create Tarball Package
echo "==> Creating tarball package: ${BUILD_DIR}/${TAR_NAME}..."
tar -czf "${BUILD_DIR}/${TAR_NAME}" -C "${BUILD_DIR}" staging

# 6. Create macOS DMG (if running on macOS)
if command -v hdiutil >/dev/null 2>&1; then
  echo "==> Creating macOS DMG image: ${BUILD_DIR}/${DMG_NAME}..."
  hdiutil create \
    -volname "Cloudflare CLI v${VERSION}" \
    -srcfolder "${STAGING_DIR}" \
    -ov \
    -format UDZO \
    "${BUILD_DIR}/${DMG_NAME}"
  echo "✔ Successfully created DMG: ${BUILD_DIR}/${DMG_NAME}"
else
  echo "⚠ hdiutil not found (non-macOS environment). Skipping DMG generation."
fi

echo "========================================================"
echo "✔ Packaging complete! Artifacts available in ${BUILD_DIR}:"
ls -la "${BUILD_DIR}"
echo "========================================================"
