#!/bin/bash

# Script to identify files with unused imports
# We'll fix them one by one

echo "Generating list of files with unused imports..."

npx tsc --noUnusedLocals --noUnusedParameters --noEmit 2>&1 | \
  grep "error TS6" | \
  cut -d'(' -f1 | \
  sort -u > /tmp/files_with_unused_imports.txt

echo "Files with unused imports:"
cat /tmp/files_with_unused_imports.txt

echo ""
echo "Total files: $(wc -l < /tmp/files_with_unused_imports.txt)"
