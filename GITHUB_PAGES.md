# GitHub Pages Deployment Guide

This repository is configured to automatically deploy to GitHub Pages.

## Automatic Deployment

The repository has a GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically:
- Builds the documentation site
- Deploys to GitHub Pages on every push to `main` branch
- Makes documentation accessible at: `https://USERNAME.github.io/apple-commerce`

## Manual GitHub Pages Setup

If automatic deployment doesn't work:

1. **Go to Repository Settings**
   - Click Settings → Pages

2. **Configure GitHub Pages**
   - Source: Deploy from a branch
   - Branch: main
   - Folder: / (root)
   - Click Save

3. **Wait for Deployment**
   - GitHub will build and deploy your site
   - Site URL will appear in Pages settings

## Production PHP Backend Deployment

GitHub Pages only hosts static files. To deploy the full PHP application:

1. **Choose Hosting** (see DEPLOYMENT.md)
   - Hostinger, GoDaddy, Namecheap, or other PHP hosting

2. **Upload Files**
   - Use FileZilla FTP client
   - Upload to `public_html/` folder

3. **Configure**
   - Set permissions: 755 for folders, 644 for files
   - Create `/data` directory for JSON storage
   - Enable SSL certificate

## Documentation Structure

- `README.md` - Main documentation
- `DEPLOYMENT.md` - Detailed deployment guide
- `.github/workflows/deploy.yml` - GitHub Actions workflow

## Local Testing

To test locally before pushing:

```bash
# Install PHP
# macOS with Homebrew
brew install php

# Start PHP server
php -S localhost:8000

# Open browser
http://localhost:8000
```

## Troubleshooting

**Pages not deploying?**
- Check GitHub Actions tab for build errors
- Verify branch name is correct (main or master)
- Clear browser cache (Ctrl+Shift+Del)

**API endpoints returning 404?**
- GitHub Pages only serves static files
- Deploy backend to PHP hosting separately
- Update API URLs in JavaScript to point to production server

**Custom domain not working?**
- Add CNAME file to root with your domain
- Update DNS records at domain registrar
- Wait 15-30 minutes for DNS propagation

---

For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md)
