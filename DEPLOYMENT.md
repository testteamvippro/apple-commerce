# 🚀 Deployment Guide

Complete guide to deploy Apple e-commerce platform to production.

---

## Option 1: GitHub Pages (Documentation Site)

GitHub Pages serves static files. Use this for documentation and demo site while hosting PHP backend separately.

### 1.1 Enable GitHub Pages

1. **Go to Repository Settings**
   - GitHub → Settings → Pages

2. **Configure**
   - Source: Deploy from branch
   - Branch: main
   - Folder: / (root)
   - Save

3. **Access Site**
   - Your site will be available at: `https://username.github.io/apple-commerce`

### 1.2 Custom Domain (Optional)

```yaml
# Add to root directory as CNAME file
yourdomain.com
```

Then update DNS records in your domain registrar to point to GitHub Pages.

---

## Option 2: Production Hosting (Recommended)

Deploy the complete PHP application to shared hosting.

### 2.1 Choose Hosting Provider

**Recommended Providers** (PHP 7.4+, affordable):

| Provider | Price/Month | Location | Support |
|----------|-----------|----------|---------|
| **Hostinger** | $2.99 | Global | 24/7 Chat |
| **GoDaddy** | $3.99 | Global | Good |
| **Namecheap** | $2.88 | Global | Email |
| **Tenten.vn** | 40k | Vietnam | Good |
| **Iserver.vn** | 50k | Vietnam | Excellent |

### 2.2 Hosting Requirements

✅ PHP 7.4 or higher (8.0+ recommended)  
✅ FTP/SFTP access  
✅ cPanel or similar file manager  
✅ SSL certificate (Let's Encrypt, usually free)  
✅ Ability to create directories in `/public_html`

### 2.3 Step-by-Step Upload

#### Via FileZilla (Easiest)

1. **Download**: https://filezilla-project.org/
2. **File → Site Manager → New Site**
3. **Enter FTP credentials** from hosting provider
4. **Connect**
5. **Navigate to `public_html` folder**
6. **Drag all files** from local folder to `public_html`

```
Upload these folders/files:
├── admin/
├── pages/
├── api/
├── assets/
├── data/           (create empty folder)
├── index.html
├── login.html
├── register.html
├── cart.html
├── checkout.html
├── checkout-payment.html
├── orders.html
├── profile.html
└── .htaccess       (optional, for URL rewriting)
```

#### Via cPanel File Manager

1. **Login to cPanel**: https://yourdomain.com:2083
2. **File Manager → public_html**
3. **Upload → Select Files** → Choose all files
4. **Wait for upload to complete**

#### Via SSH (Advanced)

```bash
# Connect to server
ssh username@yourdomain.com

# Navigate to public_html
cd public_html

# Clone repository (if available on public repo)
git clone https://github.com/YOUR-GITHUB-USERNAME/apple-commerce.git .

# Or upload via SCP
scp -r /local/path/apple-commerce/* username@yourdomain.com:~/public_html/
```

### 2.4 Post-Upload Configuration

#### Create Data Directory

```bash
# Via SSH
mkdir -p data
chmod 755 data

# Or via cPanel File Manager
- Right-click → Create Folder → "data"
- Permissions: 755
```

#### Set File Permissions

```bash
# Via SSH
chmod 644 *.html *.php
chmod 755 api/
chmod 755 data/

# Or via cPanel
- Select files/folders
- Change Permissions (755 for folders, 644 for files)
```

#### Configure .htaccess (Optional)

Create `.htaccess` in root for pretty URLs:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  
  # Route all requests to index.html except existing files
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^(.*)$ index.html [L]
</IfModule>
```

### 2.5 Test Deployment

1. **Visit website**: `https://yourdomain.com`
2. **Check homepage**: Should load product catalog
3. **Test admin**: `https://yourdomain.com/admin.html`
4. **Verify API**: `https://yourdomain.com/api/products.php`

---

## Configuration for Production

### API Keys & Secrets

Update these in respective files:

#### Stripe Setup (`api/payments.php`)
```php
define('STRIPE_SECRET_KEY', 'sk_live_YOUR_PRODUCTION_KEY');
```

#### VNPay Setup (`api/payments.php`)
```php
define('VNPAY_MERCHANT_CODE', 'YOUR_MERCHANT_CODE');
define('VNPAY_HASH_SECRET', 'YOUR_HASH_SECRET');
define('VNPAY_PAYMENT_URL', 'https://payment.vnpayment.vn/paygate');
```

#### Email Notifications
```php
// Update in api/notifications.php and api/orders.php
$to = 'customer@example.com';
$subject = 'Your Order Confirmation';
mail($to, $subject, $message, $headers);
```

### SSL Certificate

Most hosting provides free SSL (Let's Encrypt):

1. **cPanel → AutoSSL**
2. **Select domain**
3. **Install**
4. **Verify**: https://yourdomain.com (green lock)

### Environment Variables

Create `.env` file in root (if needed):

```bash
STRIPE_KEY=pk_live_...
VNPAY_CODE=...
DATABASE_PATH=/home/username/public_html/data
```

---

## Troubleshooting

### Issue: 404 - Page Not Found

**Solution:**
- Verify files uploaded to `public_html`
- Check file permissions (644 for files, 755 for folders)
- Clear browser cache (Ctrl+Shift+Del)

### Issue: API Returns 500 Error

**Solution:**
- Check `/data` folder exists and is writable (755 permissions)
- Verify PHP version is 7.4+
- Check error log: `cPanel → Error Log`

### Issue: Payment Integration Not Working

**Solution:**
- Verify API keys in `api/payments.php`
- Check SSL is enabled (https://)
- Test with test cards/credentials first

### Issue: Images/CSS Not Loading

**Solution:**
- Verify assets folder structure is correct
- Check file permissions (644)
- Use relative paths in links (not absolute)

---

## Maintenance

### Regular Backups

```bash
# Via cPanel
Backups → Generate Full Backup → Download

# Via SSH
tar -czf backup-$(date +%Y%m%d).tar.gz ~/public_html/
```

### Monitor Error Log

```bash
# SSH access
tail -f /home/username/public_html/error.log

# Or cPanel
Error Log section
```

### Update Files

```bash
# SSH git pull
cd ~/public_html
git pull origin main

# Or upload new files via FileZilla
```

---

## Performance Optimization

### Enable Gzip Compression

Add to `.htaccess`:
```apache
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript
</IfModule>
```

### Cache Control

Add to `.htaccess`:
```apache
<FilesMatch "\.(jpg|jpeg|png|gif|ico|css|js)$">
  Header set Cache-Control "max-age=31536000, public"
</FilesMatch>
```

### Optimize Images

- Use WebP format where possible
- Compress images before upload
- Use CDN for media files (optional)

---

## Security Checklist

- ✅ Enable HTTPS/SSL
- ✅ Use strong admin passwords
- ✅ Keep PHP updated
- ✅ Validate all user inputs
- ✅ Don't expose API keys in frontend code
- ✅ Use environment variables for secrets
- ✅ Regular backups
- ✅ Monitor access logs

---

## Support & Resources

- **PHP Documentation**: https://www.php.net/docs.php
- **cPanel Help**: https://docs.cpanel.net/
- **Hostinger Docs**: https://www.hostinger.com/tutorials
- **GitHub Pages Docs**: https://docs.github.com/en/pages

---

**Last Updated**: May 9, 2026  
**Version**: 2.0  
**Status**: ✅ Production Ready
