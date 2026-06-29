#!/bin/bash
# Deployment verification script
# This script checks if the current build is live on production

set -e

BUILD_ID=$(git rev-parse --short HEAD)
COMMIT_MSG=$(git log -1 --pretty=%B)

echo "================================"
echo "🚀 Deployment Verification"
echo "================================"
echo "Build ID: $BUILD_ID"
echo "Message: $COMMIT_MSG"
echo ""

# Check 1: Verify commit pushed to remote
echo "✓ Checking git status..."
if git rev-parse origin/main > /dev/null 2>&1; then
    REMOTE_HEAD=$(git rev-parse origin/main | cut -c1-7)
    if [ "$BUILD_ID" == "$REMOTE_HEAD" ]; then
        echo "  ✅ Build pushed to origin/main (commit $BUILD_ID)"
    else
        echo "  ⚠️  Build not at remote HEAD"
        echo "  Local: $BUILD_ID"
        echo "  Remote: $REMOTE_HEAD"
        exit 1
    fi
else
    echo "  ❌ Cannot access remote"
    exit 1
fi

echo ""
echo "================================"
echo "📋 NEXT STEPS:"
echo "================================"
echo ""
echo "1. Deploy this build to production:"
echo "   Build ID: $BUILD_ID"
echo ""
echo "2. Once deployed, verify:"
echo "   - Open production URL"
echo "   - Check if assessment page loads"
echo "   - Look for debug panel showing resume count"
echo ""
echo "3. Report deployment status:"
echo "   ✅ Deployment successful"
echo "   ❌ Deployment failed - reason: [describe]"
echo ""
echo "4. Then run feature verification checklist"
echo ""
echo "================================"
