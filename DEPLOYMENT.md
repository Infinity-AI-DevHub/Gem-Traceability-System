# Gem Track production deployment

This guide deploys the application at `https://inventory.1ctstore.com` using:

- aaPanel with Nginx
- PM2 for the frontend and backend processes
- aaPanel MySQL
- Cloudflare DNS
- local image storage in `/www/wwwroot/gem-track/backend/uploads`

The public ports are only 80 and 443. PM2 binds the frontend to
`127.0.0.1:3500` and the backend to `127.0.0.1:4500`; do not expose either port
through the VPS firewall.

## 1. Before deployment

Prepare these values:

- VPS public IPv4 address
- Git repository URL, or a ZIP of this repository
- aaPanel MySQL database name, username, password, host, and port
- A new administrator username and a password of at least 14 characters with
  uppercase and lowercase letters, a number, and a symbol

The server needs Node.js 22.13 or newer, npm, Git, Nginx, MySQL, and PM2.
Install Nginx and MySQL from aaPanel. Install a supported Node.js 22 release,
then verify:

```bash
node --version
npm --version
sudo npm install --global pm2
pm2 --version
```

## 2. Configure Cloudflare DNS

In Cloudflare, open **DNS > Records** and create:

| Type | Name | Content | Proxy |
| --- | --- | --- | --- |
| A | `inventory` | `YOUR_VPS_IPV4` | Proxied |

Use only one active A record for this hostname unless the VPS also has a
correctly configured IPv6 address. Cloudflare documents proxied A records in
its [DNS records guide](https://developers.cloudflare.com/dns/manage-dns-records/).

If aaPanel's HTTP certificate verification fails while the record is proxied,
temporarily switch it to **DNS only**, issue the certificate, verify HTTPS, and
then enable **Proxied** again.

## 3. Create the MySQL database in aaPanel

In **aaPanel > Databases > MySQL > Add database**:

1. Create a production database. `gem-track` is valid, although aaPanel may
   generate a different database name.
2. Create a dedicated application user. Do not use the MySQL `root` account.
3. Grant that user access only to this database.
4. Restrict database access to the local server (`127.0.0.1` or `localhost`).
5. Record the exact database name, user, password, and port shown by aaPanel.

Do not import the sample review data into production.

## 4. Upload the application

This guide uses `/www/wwwroot/gem-track` as the permanent path.

```bash
cd /www/wwwroot
git clone YOUR_REPOSITORY_URL gem-track
cd /www/wwwroot/gem-track
npm ci
```

If Git is not used, upload and extract the project to the same directory, then
run `npm ci`. Do not upload local `.env` files, `node_modules`, `.next`, or
`backend/uploads` from a development computer.

Create the persistent upload folders and ensure the account that runs PM2 can
write to them:

```bash
mkdir -p /www/wwwroot/gem-track/backend/uploads/{stones,sellers,jewellery}
chown -R YOUR_PM2_USER:YOUR_PM2_USER /www/wwwroot/gem-track
chmod -R u=rwX,g=rX,o= /www/wwwroot/gem-track/backend/uploads
```

Replace `YOUR_PM2_USER` with the non-root Linux account that will own the PM2
processes. Run all later PM2 commands as that same account.

## 5. Configure production environment files

Create the backend environment file:

```bash
cd /www/wwwroot/gem-track
cp backend/.env.production.example backend/.env
nano backend/.env
```

Use the real aaPanel database values:

```dotenv
NODE_ENV=production
PORT=4500
FRONTEND_ORIGIN=https://inventory.1ctstore.com
PUBLIC_BASE_URL=https://inventory.1ctstore.com
UPLOAD_DIR=uploads
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=YOUR_AAPANEL_DATABASE
DB_USER=YOUR_AAPANEL_DATABASE_USER
DB_PASSWORD=YOUR_STRONG_DATABASE_PASSWORD
DB_CONNECTION_LIMIT=10
VAPID_PUBLIC_KEY=YOUR_PUBLIC_VAPID_KEY
VAPID_PRIVATE_KEY=YOUR_PRIVATE_VAPID_KEY
VAPID_SUBJECT=mailto:admin@1ctstore.com
```

Generate the two VAPID keys once on the server:

```bash
npm exec --workspace backend web-push -- generate-vapid-keys --json
```

Copy the returned public and private values into `backend/.env`. Keep the
private key secret and backed up. Do not generate new keys during normal
deployments, because browsers subscribed with the old key would need to enable
alerts again. Browser notifications require HTTPS; the production domain
already meets that requirement after the SSL step below.

Create the frontend production environment before building:

```bash
cp frontend/.env.production.example frontend/.env.production
```

Its value must be:

```dotenv
NEXT_PUBLIC_API_URL=https://inventory.1ctstore.com/api/v1
```

Protect the secrets:

```bash
chmod 600 backend/.env frontend/.env.production
```

## 6. Create the schema and administrator

Run every command from the repository root:

```bash
cd /www/wwwroot/gem-track
npm run db:migrate --workspace backend
npm run images:migrate --workspace backend
npm run admin:create --workspace backend -- YOUR_ADMIN_USERNAME 'YOUR_LONG_ADMIN_PASSWORD'
```

The image migration is safe to run again. It moves legacy image blobs from
MySQL into `backend/uploads` and stores their relative file paths in MySQL.
Future stone, supplier, and jewellery images are written directly to that
folder.

Avoid putting a real password directly into shell history. A safer interactive
pattern is:

```bash
read -rsp 'New administrator password: ' GEM_ADMIN_PASSWORD; echo
npm run admin:create --workspace backend -- YOUR_ADMIN_USERNAME "$GEM_ADMIN_PASSWORD"
unset GEM_ADMIN_PASSWORD
```

## 7. Build and test before PM2

```bash
cd /www/wwwroot/gem-track
npm run lint
npm test
npm run build
```

The deployment should stop if any command fails.

## 8. Start both services with PM2

The included `ecosystem.config.cjs` expects the project at
`/www/wwwroot/gem-track`.

```bash
cd /www/wwwroot/gem-track
pm2 start ecosystem.config.cjs
pm2 status
pm2 logs --lines 100
```

Verify both private listeners:

```bash
curl -I http://127.0.0.1:3500/login
curl http://127.0.0.1:4500/api/v1/health
curl http://127.0.0.1:4500/api/v1/health/database
```

The frontend should return HTTP 200 or a valid redirect. Both health endpoints
must return a JSON status of `ok`.

Enable automatic recovery after a VPS restart:

```bash
pm2 startup
```

Run the exact `sudo ...` command printed by PM2, then run:

```bash
pm2 save
```

PM2's official guidance requires both `pm2 startup` and `pm2 save` for boot
recovery: [PM2 startup documentation](https://pm2.keymetrics.io/docs/usage/startup/).

## 9. Create the aaPanel website and reverse proxy

In **aaPanel > Website > Add site**:

1. Domain: `inventory.1ctstore.com`
2. Root: `/www/wwwroot/gem-track`
3. PHP: **Static** or **Not set**
4. Do not create another database from this screen if the production database
   already exists.

Open the website's Nginx configuration. Keep aaPanel's generated SSL certificate
lines and add these directives inside the HTTPS `server` block. Remove any
conflicting default `location /` block first.

```nginx
client_max_body_size 120m;

location /api/ {
    proxy_pass http://127.0.0.1:4500;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 120s;
    proxy_send_timeout 120s;
    proxy_buffering off;
    proxy_hide_header X-Powered-By;
}

location /uploads/ {
    proxy_pass http://127.0.0.1:4500;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_buffering off;
    proxy_hide_header X-Powered-By;
}

location / {
    proxy_pass http://127.0.0.1:3500;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 120s;
    proxy_hide_header X-Powered-By;
}

location ~ /\. {
    deny all;
}
```

Save the configuration, use aaPanel's configuration test, and reload Nginx.
aaPanel documents website reverse-proxy management in its
[Website guide](https://www.aapanel.com/docs/SubaaPanel/Website.html).

## 10. Enable HTTPS

In the aaPanel website's **SSL** section, issue a Let's Encrypt certificate for
`inventory.1ctstore.com` and enable forced HTTPS.

After the origin certificate works, open Cloudflare **SSL/TLS > Overview** and
select **Full (strict)**. Cloudflare recommends Full (strict) when the origin
has a valid matching certificate:
[Cloudflare Full (strict)](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/).

Do not use Cloudflare **Flexible** mode; it can create redirect loops and leaves
the Cloudflare-to-VPS connection unencrypted.

In Cloudflare, keep the proxy enabled and create a rate-limiting rule for
`POST /api/v1/auth/login` if that feature is available on the account. The
application also blocks repeated attempts by username and IP, but filtering at
Cloudflare reduces unnecessary traffic reaching the VPS. Never create a cache
rule for `/api/*` or `/uploads/*`.

## 11. Final production verification

Run these checks after Nginx and Cloudflare are active:

```bash
curl -I https://inventory.1ctstore.com/login
curl https://inventory.1ctstore.com/api/v1/health
curl https://inventory.1ctstore.com/api/v1/health/database
pm2 status
pm2 logs gem-track-backend --lines 100
pm2 logs gem-track-frontend --lines 100
```

Then verify in a browser:

1. Log in with the newly created administrator.
2. Create a temporary stone and upload an image.
3. Confirm a new file appears under `backend/uploads/stones`.
4. Reload the stone page and confirm the image still displays.
5. Test supplier and jewellery image uploads.
6. Test stone intake, workshop dispatch/return, jewellery creation, promotions,
   salesman handover/return/sale, direct sale, payments, and reports.
7. Test the interface at mobile width.
8. Log out and confirm a copied `/uploads/...` URL is no longer accessible.

## 12. Backups

The database and upload directory form one logical backup. Back up both at the
same time. A database-only backup will not contain uploaded images.

Example manual backup:

```bash
mkdir -p /www/backup/gem-track
mysqldump --single-transaction --routines --triggers \
  -h 127.0.0.1 -P 3306 -u YOUR_AAPANEL_DATABASE_USER -p \
  YOUR_AAPANEL_DATABASE \
  > /www/backup/gem-track/database-$(date +%F-%H%M).sql

tar -C /www/wwwroot/gem-track/backend -czf \
  /www/backup/gem-track/uploads-$(date +%F-%H%M).tar.gz uploads
```

Use aaPanel's scheduled backup feature or a root-owned cron job for daily
backups. Retain multiple versions and copy backups off the VPS. Test a restore
periodically.

## 13. Updating the application

Take a database and uploads backup first, then:

```bash
cd /www/wwwroot/gem-track
git pull --ff-only
npm ci
npm run db:migrate --workspace backend
npm run images:migrate --workspace backend
npm run lint
npm test
npm run build
pm2 reload ecosystem.config.cjs --update-env
pm2 save
```

Do not run `git clean` against this checkout because `backend/uploads` contains
production data.

## 14. Troubleshooting

### 502 Bad Gateway

```bash
pm2 status
pm2 logs --lines 200
ss -ltnp | grep -E ':3500|:4500'
curl -I http://127.0.0.1:3500/login
curl http://127.0.0.1:4500/api/v1/health
```

### Tailwind `Cannot find native binding` during build

This means Linux optional packages were not installed, commonly because
`node_modules` came from another operating system or npm omitted optional
dependencies. The repository pins the required Linux x64 GNU binding. Keep the
committed lockfile and rebuild dependencies on the VPS:

```bash
cd /www/wwwroot/gem-track
rm -rf /www/wwwroot/gem-track/node_modules
rm -rf /www/wwwroot/gem-track/frontend/.next
npm cache verify
npm ci --include=optional
npm run build
```

Never upload a development computer's `node_modules` directory to the VPS.

### Database connection fails

- Recheck the aaPanel database name and dedicated user's password.
- Confirm MySQL is listening on the configured port.
- Confirm the application user has privileges on the selected database.
- Run `curl http://127.0.0.1:4500/api/v1/health/database` and inspect the backend
  PM2 log.

### Images upload but do not display

- Confirm `PUBLIC_BASE_URL=https://inventory.1ctstore.com`.
- Confirm Nginx proxies `/uploads/` to port 4500.
- Confirm the PM2 user can read and write `backend/uploads`.
- Confirm migration `014_filesystem_image_storage.sql` is listed in
  `schema_migrations`.
- Do not create Cloudflare cache rules for `/api/*` or `/uploads/*`.

### Cloudflare 526

The origin certificate is missing, expired, or does not match the hostname.
Install/renew the aaPanel certificate before using Full (strict).

### Safe rollback

Restore the previous Git commit, run `npm ci`, rebuild, and reload PM2. Do not
delete the upload directory. Database migrations are forward-only, so restore
the paired pre-update database and uploads backup if a release requires a full
data rollback.
