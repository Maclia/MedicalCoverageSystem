# SSL Certificates for Production

Place your SSL certificates in this directory for production deployments using the nginx reverse proxy.

## Required Files

- `cert.pem` - SSL certificate file
- `key.pem` - SSL private key file

## How to Generate Self-Signed Certificates (for testing)

For development/testing purposes, you can generate self-signed certificates:

```bash
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```

**Warning:** Self-signed certificates will cause browser security warnings. Use proper certificates from a trusted Certificate Authority (e.g., Let's Encrypt) for production.

## Production Certificates

For production, use certificates from a trusted Certificate Authority:

### Let's Encrypt (Free SSL)

```bash
# Install certbot
sudo apt-get install certbot

# Generate certificate
sudo certbot certonly --standalone -d yourdomain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/key.pem
```

### Commercial Certificates

If using a commercial Certificate Authority:
1. Purchase SSL certificate
2. Download certificate files
3. Rename them to `cert.pem` and `key.pem`
4. Place them in this directory

## File Permissions

Ensure proper file permissions:

```bash
chmod 600 nginx/ssl/key.pem
chmod 644 nginx/ssl/cert.pem
```

## Important

- Never commit real SSL certificates or private keys to version control
- Keep private keys secure
- Renew certificates before expiration
- For Docker deployments, ensure files are not overwritten during container builds
