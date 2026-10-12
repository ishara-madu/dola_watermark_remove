#!/bin/bash
# Deploy script: updates gh-pages branch incrementally from dola_watermark_remove_web folder

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_DIR="$REPO_ROOT/dola_watermark_remove_web"

if [ ! -d "$WEB_DIR" ]; then
  echo "❌ Error: dola_watermark_remove_web directory not found!"
  exit 1
fi

echo "🔄 Fetching latest origin/gh-pages..."
git fetch origin gh-pages:refs/remotes/origin/gh-pages || true

echo "🚀 Building gh-pages tree from dola_watermark_remove_web..."

GIT_INDEX_FILE="$REPO_ROOT/.git/index-gh-pages"
export GIT_INDEX_FILE
export GIT_DIR="$REPO_ROOT/.git"
export GIT_WORK_TREE="$WEB_DIR"

rm -f "$GIT_INDEX_FILE"
git add -A .
TREE_ID=$(git write-tree)
rm -f "$GIT_INDEX_FILE"

PARENT_COMMIT=""
if git rev-parse --verify origin/gh-pages >/dev/null 2>&1; then
  PARENT_COMMIT="-p $(git rev-parse origin/gh-pages)"
fi

COMMIT_ID=$(git commit-tree "$TREE_ID" $PARENT_COMMIT -m "Update gh-pages: download-only Monetag ads ($(date '+%Y-%m-%d %H:%M:%S'))")
git update-ref refs/heads/gh-pages "$COMMIT_ID"

echo "📤 Pushing gh-pages to origin..."
git push origin gh-pages

echo "✅ Successfully deployed to gh-pages!"
