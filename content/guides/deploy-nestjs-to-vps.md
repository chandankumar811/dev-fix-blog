# Deploy NestJS to VPS (Step-by-Step Guide)

A comprehensive guide to deploying your NestJS application to a VPS (Virtual Private Server) with best practices for production.

## Prerequisites

- VPS with Ubuntu 20.04/22.04 (DigitalOcean, Linode, AWS EC2, etc.)
- Domain name (optional but recommended)
- SSH access to your VPS
- NestJS application ready to deploy

## Project Structure for Deployment

```
your-project/
├── src/
├── dist/
├── node_modules/
├── .env.production
├── .gitignore
├── package.json
├── tsconfig.json
├── ecosystem.config.js (PM2 config)
└── nginx.conf (Nginx config)
```

## Step 1: Prepare Your Application

### Update package.json

```json
{
  "name": "your-nestjs-app",
  "version": "1.0.0",
  "scripts": {
    "build": "nest build",
    "start": "node dist/main",
    "start:prod": "node dist/main",
    "start:dev": "nest start --watch"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}
```

### Create .env.production

```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://localhost:27017/production-db
JWT_SECRET=your-secure-jwt-secret
API_URL=https://yourdomain.com
```

### Update .gitignore

```
node_modules/
dist/
.env
.env.production
*.log
```

## Step 2: Connect to Your VPS

```bash
# SSH into your VPS
ssh root@your-vps-ip

# Or if using a key
ssh -i /path/to/key.pem root@your-vps-ip
```

## Step 3: Initial VPS Setup

### Update System

```bash
apt update && apt upgrade -y
```

### Create Non-Root User

```bash
# Create new user
adduser deployuser

# Add to sudo group
usermod -aG sudo deployuser

# Switch to new user
su - deployuser
```

### Setup Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

## Step 4: Install Node.js

### Using NodeSource Repository

```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

### Alternative: Using NVM

```bash
# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

# Install Node.js
nvm install 20
nvm use 20
nvm alias default 20
```

## Step 5: Install MongoDB

```bash
# Import MongoDB public key
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Create list file
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
   sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Install MongoDB
sudo apt update
sudo apt install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify
sudo systemctl status mongod
```

### Secure MongoDB

```bash
# Connect to MongoDB
mongosh

# Create admin user
use admin
db.createUser({
  user: "admin",
  pwd: "strong-password-here",
  roles: [ { role: "userAdminAnyDatabase", db: "admin" } ]
})

# Create application database user
use production-db
db.createUser({
  user: "appuser",
  pwd: "app-password-here",
  roles: [ { role: "readWrite", db: "production-db" } ]
})

exit
```

### Enable MongoDB Authentication

```bash
# Edit MongoDB config
sudo nano /etc/mongod.conf

# Add under security section:
security:
  authorization: enabled

# Restart MongoDB
sudo systemctl restart mongod
```

Update your connection string:
```
MONGODB_URI=mongodb://appuser:app-password-here@localhost:27017/production-db
```

## Step 6: Install PM2

```bash
# Install PM2 globally
sudo npm install -g pm2

# Verify installation
pm2 --version
```

## Step 7: Deploy Your Application

### Option A: Using Git (Recommended)

```bash
# Install Git
sudo apt install git -y

# Create app directory
mkdir -p ~/apps
cd ~/apps

# Clone your repository
git clone https://github.com/yourusername/your-repo.git
cd your-repo

# Install dependencies
npm ci --production

# Create .env file
nano .env
# Paste your production environment variables

# Build application
npm run build
```

### Option B: Using SCP/SFTP

```bash
# From your local machine
scp -r ./dist deployuser@your-vps-ip:~/apps/your-app/
scp package.json deployuser@your-vps-ip:~/apps/your-app/
scp package-lock.json deployuser@your-vps-ip:~/apps/your-app/

# Then SSH and install
ssh deployuser@your-vps-ip
cd ~/apps/your-app
npm ci --production
```

## Step 8: Configure PM2

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'nestjs-app',
    script: './dist/main.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G',
    watch: false
  }]
};
```

### Start Application with PM2

```bash
# Create logs directory
mkdir -p logs

# Start application
pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Run the command that PM2 outputs

# View logs
pm2 logs

# Monitor
pm2 monit

# Other useful commands
pm2 status          # Check status
pm2 restart all     # Restart app
pm2 stop all        # Stop app
pm2 delete all      # Delete from PM2
```

## Step 9: Install and Configure Nginx

```bash
# Install Nginx
sudo apt install nginx -y

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Configure Nginx as Reverse Proxy

```bash
# Create Nginx config
sudo nano /etc/nginx/sites-available/your-app
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript 
               application/x-javascript application/xml+rss application/json;

    # Client body size limit
    client_max_body_size 10M;
}
```

### Enable the site

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/your-app /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## Step 10: Setup SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Follow the prompts and choose to redirect HTTP to HTTPS

# Test auto-renewal
sudo certbot renew --dry-run
```

Your Nginx config will be automatically updated to:

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Rest of configuration...
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

## Step 11: Setup Monitoring and Logging

### Configure Log Rotation

```bash
sudo nano /etc/logrotate.d/nestjs-app
```

Add:

```
/home/deployuser/apps/your-app/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 deployuser deployuser
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

### Setup PM2 Monitoring

```bash
# Install PM2 web monitoring
pm2 install pm2-logrotate

# Configure
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

## Step 12: Deployment Script

Create `deploy.sh` in your local project:

```bash
#!/bin/bash

echo "🚀 Starting deployment..."

# Variables
SERVER="deployuser@your-vps-ip"
APP_DIR="~/apps/your-app"

# Build locally
echo "📦 Building application..."
npm run build

# Copy files to server
echo "📤 Uploading files..."
scp -r dist package.json package-lock.json .env.production $SERVER:$APP_DIR/

# Run commands on server
echo "🔧 Installing dependencies and restarting..."
ssh $SERVER << 'ENDSSH'
    cd ~/apps/your-app
    npm ci --production
    mv .env.production .env
    pm2 restart ecosystem.config.js
    pm2 save
ENDSSH

echo "✅ Deployment completed!"
```

Make it executable:

```bash
chmod +x deploy.sh
```

## Step 13: Database Backup

Create backup script `backup.sh`:

```bash
#!/bin/bash

# Variables
BACKUP_DIR="/home/deployuser/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="production-db"
DB_USER="appuser"
DB_PASS="app-password-here"

# Create backup directory
mkdir -p $BACKUP_DIR

# Dump database
mongodump --db=$DB_NAME -u $DB_USER -p $DB_PASS --out=$BACKUP_DIR/$DATE

# Compress backup
tar -czf $BACKUP_DIR/$DATE.tar.gz -C $BACKUP_DIR $DATE
rm -rf $BACKUP_DIR/$DATE

# Keep only last 7 backups
cd $BACKUP_DIR
ls -t | tail -n +8 | xargs rm -f

echo "Backup completed: $DATE.tar.gz"
```

### Schedule Automated Backups

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /home/deployuser/backup.sh
```

## Step 14: Security Hardening

### Install Fail2Ban

```bash
sudo apt install fail2ban -y

# Create local config
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Edit config
sudo nano /etc/fail2ban/jail.local

# Enable SSH protection
[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600

# Restart Fail2Ban
sudo systemctl restart fail2ban
```

### Configure System Limits

```bash
sudo nano /etc/security/limits.conf

# Add:
* soft nofile 65535
* hard nofile 65535
```

## Useful Commands

### Application Management

```bash
# Restart app
pm2 restart all

# View logs
pm2 logs --lines 100

# Monitor resources
pm2 monit

# Update app code
cd ~/apps/your-app
git pull
npm ci --production
npm run build
pm2 restart all
```

### Server Management

```bash
# Check disk space
df -h

# Check memory
free -h

# Check running processes
htop

# Check Nginx status
sudo systemctl status nginx

# Check MongoDB status
sudo systemctl status mongod

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## Troubleshooting

### Application Won't Start

```bash
# Check PM2 logs
pm2 logs

# Check if port is in use
sudo lsof -i :3000

# Check environment variables
pm2 env 0
```

### Nginx Issues

```bash
# Test configuration
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx
```

### MongoDB Issues

```bash
# Check MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log

# Check if MongoDB is running
sudo systemctl status mongod

# Restart MongoDB
sudo systemctl restart mongod
```

## Performance Optimization

### Enable Nginx Caching

```nginx
# Add to nginx config
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=1g inactive=60m;

location / {
    proxy_cache my_cache;
    proxy_cache_valid 200 60m;
    proxy_cache_use_stale error timeout http_500 http_502 http_503 http_504;
    # ... rest of proxy settings
}
```

### Optimize PM2

```javascript
// In ecosystem.config.js
module.exports = {
  apps: [{
    instances: 'max', // Use all CPU cores
    exec_mode: 'cluster',
    max_memory_restart: '500M', // Restart if memory exceeds
    node_args: '--max-old-space-size=512'
  }]
};
```

## Conclusion

Your NestJS application is now deployed to a VPS with:

- ✅ Production-ready setup
- ✅ Process management with PM2
- ✅ Reverse proxy with Nginx
- ✅ SSL/HTTPS encryption
- ✅ Database backup automation
- ✅ Security hardening
- ✅ Monitoring and logging

