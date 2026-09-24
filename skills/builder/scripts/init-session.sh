#!/usr/bin/env bash
# init-session.sh — Initialize builder session scratch directory
set -euo pipefail

BUILDER_DIR="$HOME/tmp/builder"

# Clean previous session if it exists
if [ -d "$BUILDER_DIR" ]; then
  echo "Cleaning previous builder session..."
  rm -rf "$BUILDER_DIR"/*
fi

# Create fresh directory
mkdir -p "$BUILDER_DIR"
echo "Builder session ready: $BUILDER_DIR"
