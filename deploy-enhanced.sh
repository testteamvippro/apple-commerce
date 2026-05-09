#!/bin/bash
# ============================================================
# APPLE-COMMERCE DEPLOYMENT SCRIPT
# Deploys enhanced e-commerce system
# ============================================================

echo "🚀 Apple-Commerce Enhanced Deployment"
echo "======================================"
echo ""

# Step 1: Backup original files
echo "📦 Step 1: Backing up original files..."
cp products.json products.json.bak
cp index.html index.html.bak
cp assets/css/style.css assets/css/style.css.bak
cp assets/js/main.js assets/js/main.js.bak
echo "✅ Backups created (.bak files)"
echo ""

# Step 2: Deploy enhanced files
echo "📋 Step 2: Deploying enhanced files..."
cp products-enhanced.json products.json
cp index-enhanced.html index.html
cp assets/css/style-enhanced.css assets/css/style.css
cp assets/js/main-enhanced.js assets/js/main.js
echo "✅ Enhanced files deployed"
echo ""

# Step 3: Verify deployment
echo "🔍 Step 3: Verifying deployment..."
if [ -f "products.json" ] && [ -f "index.html" ] && [ -f "assets/css/style.css" ] && [ -f "assets/js/main.js" ]; then
    echo "✅ All files deployed successfully"
else
    echo "❌ Deployment failed - some files missing"
    exit 1
fi
echo ""

# Step 4: Git operations
echo "📤 Step 4: Preparing for Git..."
git add .
git status
echo ""
echo "Ready to commit. Run:"
echo "  git commit -m 'Implement enhanced e-commerce with variant system and hot pink design'"
echo "  git push origin main"
echo ""

echo "✅ Deployment preparation complete!"
echo ""
echo "📝 Next Steps:"
echo "  1. Review changes: git diff HEAD"
echo "  2. Commit changes: git commit -m '...'"
echo "  3. Push to GitHub: git push origin main"
echo "  4. Test on GitHub Pages: https://YOUR-GITHUB-USERNAME.github.io/apple-commerce/"
echo ""
