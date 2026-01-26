#!/bin/bash

# Google AI Companion Packaging Script
# This script creates a clean zip file for Chrome Web Store submission.

# Set variables
EXTENSION_NAME="google-ai-companion"
VERSION=$(grep '"version":' manifest.json | cut -d '"' -f 4)
ZIP_NAME="${EXTENSION_NAME}-v${VERSION}.zip"

# Create build directory
echo "Creating build package: $ZIP_NAME"

# Remove old zip if exists
rm -f "$ZIP_NAME"

# Zip contents, excluding development files
# -x excludes files/folders
# ".*" excludes hidden files like .git, .DS_Store, .trae
# "dev_docs/*" excludes our documentation folder
# "*.zip" excludes other zip files
# "*.sh" excludes this script itself

zip -r "$ZIP_NAME" . \
    -x ".*" \
    -x "__MACOSX" \
    -x "dev_docs/*" \
    -x "*.zip" \
    -x "*.sh" \
    -x "node_modules/*" \
    -x ".vscode/*" \
    -x "test/*"

echo "-----------------------------------"
echo "Build complete!"
echo "File: $ZIP_NAME"
echo "Size: $(du -h "$ZIP_NAME" | cut -f1)"
echo "-----------------------------------"
echo "Ready for Chrome Web Store upload."
