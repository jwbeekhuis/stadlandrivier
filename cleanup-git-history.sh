#!/bin/bash
# Git History Cleanup Script for Exposed Firebase API Key
# This script removes firebase-config.js from all git history

set -e  # Exit on error

echo "🔒 Git History Cleanup - Exposed API Key Removal"
echo "=================================================="
echo ""
echo "⚠️  WARNING: This will rewrite git history!"
echo "⚠️  All team members will need to re-clone the repository."
echo ""
echo "Before proceeding, ensure:"
echo "  1. You have regenerated the API key in Google Cloud Console"
echo "  2. You have a backup of this repository"
echo "  3. All team members are aware of this cleanup"
echo ""

read -p "Have you completed the above steps? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Aborting. Please complete the prerequisites first."
    exit 1
fi

echo ""
echo "📋 Current git status:"
git status --short

echo ""
echo "📊 Checking for firebase-config.js in history..."
commits=$(git log --all --oneline -- firebase-config.js | wc -l)
echo "Found firebase-config.js in $commits commits"

if [ "$commits" -eq 0 ]; then
    echo "✅ firebase-config.js not found in git history. No cleanup needed!"
    exit 0
fi

echo ""
echo "🔍 Commits containing firebase-config.js:"
git log --all --oneline --name-only -- firebase-config.js | head -20

echo ""
echo "=================================================="
echo "STEP 1: Create a backup"
echo "=================================================="

backup_dir="../stadlandrivier-backup-$(date +%Y%m%d-%H%M%S)"
echo "Creating backup at: $backup_dir"
cd ..
cp -r StadLandRivier "$backup_dir"
cd StadLandRivier
echo "✅ Backup created"

echo ""
echo "=================================================="
echo "STEP 2: Check if git-filter-repo is installed"
echo "=================================================="

if ! command -v git-filter-repo &> /dev/null; then
    echo "git-filter-repo not found. Installing..."

    if command -v pip3 &> /dev/null; then
        pip3 install git-filter-repo
    elif command -v pip &> /dev/null; then
        pip install git-filter-repo
    else
        echo "❌ Error: pip not found. Please install git-filter-repo manually:"
        echo "   https://github.com/newren/git-filter-repo"
        exit 1
    fi
else
    echo "✅ git-filter-repo is installed"
fi

echo ""
echo "=================================================="
echo "STEP 3: Remove firebase-config.js from history"
echo "=================================================="

echo "Running git-filter-repo..."
git-filter-repo --path firebase-config.js --invert-paths --force

echo "✅ File removed from git history"

echo ""
echo "=================================================="
echo "STEP 4: Verify removal"
echo "=================================================="

if git log --all --oneline -- firebase-config.js | grep -q .; then
    echo "⚠️  WARNING: firebase-config.js still found in history!"
    echo "Manual cleanup may be required."
    exit 1
else
    echo "✅ firebase-config.js successfully removed from all history"
fi

echo ""
echo "=================================================="
echo "STEP 5: Recreate your local firebase-config.js"
echo "=================================================="

if [ ! -f firebase-config.js ]; then
    if [ -f firebase-config.template.js ]; then
        echo "Copying template..."
        cp firebase-config.template.js firebase-config.js
        echo "✅ Created firebase-config.js from template"
        echo "⚠️  IMPORTANT: Edit firebase-config.js and add your NEW API key!"
    else
        echo "⚠️  WARNING: firebase-config.template.js not found"
        echo "Please create firebase-config.js manually"
    fi
else
    echo "✅ firebase-config.js already exists"
fi

echo ""
echo "=================================================="
echo "STEP 6: Push cleaned history to remote"
echo "=================================================="
echo ""
echo "⚠️  CRITICAL: This will FORCE PUSH to all branches!"
echo "⚠️  All team members will need to re-clone the repository."
echo ""

read -p "Proceed with force push? (yes/no): " push_confirm
if [ "$push_confirm" != "yes" ]; then
    echo ""
    echo "Skipping push. You can push manually later with:"
    echo "  git push origin --force --all"
    echo "  git push origin --force --tags"
    exit 0
fi

echo ""
echo "Pushing to remote..."

# Re-add the remote (git-filter-repo removes it)
git remote add origin https://github.com/jwbeekhuis/stadlandrivier.git

# Force push all branches
git push origin --force --all

# Force push tags
if git tag | grep -q .; then
    git push origin --force --tags
fi

echo "✅ Pushed cleaned history to remote"

echo ""
echo "=================================================="
echo "🎉 CLEANUP COMPLETE!"
echo "=================================================="
echo ""
echo "Next steps:"
echo "  1. Verify on GitHub that firebase-config.js is removed from history"
echo "  2. Check: https://github.com/jwbeekhuis/stadlandrivier/commits/main"
echo "  3. Search for the old key to ensure it's gone"
echo "  4. Inform all team members to re-clone the repository"
echo "  5. Monitor Google Cloud billing for any unusual activity"
echo ""
echo "Team member instructions:"
echo "  cd .."
echo "  rm -rf StadLandRivier"
echo "  git clone https://github.com/jwbeekhuis/stadlandrivier.git StadLandRivier"
echo "  cd StadLandRivier"
echo "  cp firebase-config.template.js firebase-config.js"
echo "  # Then edit firebase-config.js with the new API key"
echo ""
