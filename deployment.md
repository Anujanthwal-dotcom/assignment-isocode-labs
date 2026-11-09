# Production Deployment Guide

This guide deploys the Pharmacy Management Platform to a single Linux VPS using:

- the repository's existing `infrastructure/docker/docker-compose.yml` for PostgreSQL, Redis, and MinIO
- Node.js + pnpm on the host for the NestJS API and Next.js web app
- Caddy on the host for TLS and reverse proxying

No additional Dockerfiles are required. The application processes run under systemd.

> **Scope:** one production host. High availability, autoscaling, and managed observability require additional infrastructure and are covered in [Scaling beyond one server](#scaling-beyond-one-server).

---

## 1. Production topology

```mermaid
flowchart TB
    Browser["Customer / pharmacist / staff / admin browsers"]

    subgraph VPS["Linux VPS"]
        Caddy["Caddy :80/:443<br/>automatic HTTPS"]

        subgraph Host["Host processes (systemd)"]
            Web["Next.js<br/>127.0.0.1:3000"]
            API["NestJS API<br/>127.0.0.1:3001"]
        end

        subgraph Docker["Existing Docker Compose"]
            Postgres[("PostgreSQL 16<br/>127.0.0.1:5432")]
            Redis[("Redis 7<br/>127.0.0.1:6379")]
            MinIO[("MinIO<br/>127.0.0.1:9000")]
        end
    end

    Brevo["Brevo<br/>transactional email"]
    Gemini["Google Gemini<br/>optional AI provider"]

    Browser -->|HTTPS| Caddy
    Caddy -->|app.example.com| Web
    Caddy -->|api.example.com| API
    Caddy -->|files.example.com| MinIO

    API --> Postgres
    API --> Redis
    API --> MinIO
    API --> Brevo
    API --> Gemini
```

Three hostnames are used:

- `app.example.com` — web application
- `api.example.com` — REST API and Swagger
- `files.example.com` — MinIO object endpoint used by presigned prescription URLs

Keep all three under the same registrable domain. The API sets `SameSite=Lax` cookies, so the web and API must be same-site. Unrelated domains will break login.

---

## 2. Before you begin

Collect or decide:

- [ ] A domain you control (examples use `example.com`)
- [ ] A VPS running Ubuntu 22.04 or 24.04
- [ ] SSH access with a non-root sudo user
- [ ] Brevo account, API key, and verified sender/domain
- [ ] Gemini API key (optional; the mock AI provider works without it)
- [ ] A backup destination outside the VPS
- [ ] A maintenance window for the first deployment

**Recommended:** 4 vCPU, 8 GB RAM, 40 GB SSD.
**Minimum:** 2 vCPU, 4 GB RAM, 20 GB SSD, plus at least 2 GB swap for the Next.js build.

---

## 3. Prepare the server

### 3.1 Create a deploy user and harden SSH

```bash
# As root on a fresh server
adduser --disabled-password --gecos "" deploy
usermod -aG sudo deploy
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy

# From your workstation
ssh-copy-id deploy@SERVER_IP
ssh deploy@SERVER_IP
```

Edit `/etc/ssh/sshd_config`:

```text
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```

Reload SSH:

```bash
sudo systemctl reload ssh
```

### 3.2 Install Docker Engine and Compose

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
newgrp docker
docker --version
docker compose version
```

### 3.3 Install Node.js and pnpm

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo corepack enable
sudo corepack prepare pnpm@12.16.1 --activate
node --version   # v22.x
pnpm --version   # 12.16.1
```

### 3.4 Configure the firewall

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 443/udp
sudo ufw enable
sudo ufw status
```

Docker-published ports can bypass UFW. Section 6.2 binds the database, Redis, and MinIO ports to loopback, which is the actual protection. Do not rely on UFW alone for container ports.

### 3.5 Optional: fail2ban and swap

```bash
sudo apt-get update
sudo apt-get install -y fail2ban
sudo systemctl enable --now fail2ban
```

On a 4 GB host, add swap before building:

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 4. Configure DNS

| Type | Name    | Value       | Proxy                |
| ---- | ------- | ----------- | -------------------- |
| `A`  | `app`   | `SERVER_IP` | DNS only recommended |
| `A`  | `api`   | `SERVER_IP` | DNS only recommended |
| `A`  | `files` | `SERVER_IP` | DNS only recommended |

Verify all three resolve:

```bash
dig +short app.example.com
dig +short api.example.com
dig +short files.example.com
```

Caddy needs ports `80` and `443` reachable to issue certificates. If using Cloudflare, keep DNS-only during the first deployment, then verify uploads and presigned URLs before enabling the proxy. Cloudflare request-size limits can affect large prescription uploads.

---

## 5. Get the code

```bash
sudo mkdir -p /opt/pharmacy-platform
sudo chown "$USER":"$USER" /opt/pharmacy-platform
git clone YOUR_REPOSITORY_URL /opt/pharmacy-platform
cd /opt/pharmacy-platform
git checkout main   # or a release tag
```

---

## 6. Configure infrastructure and environment

### 6.1 Create the environment file

```bash
cd /opt/pharmacy-platform
cp .env.example .env
chmod 600 .env
```

Generate secrets:

```bash
openssl rand -hex 32   # POSTGRES_PASSWORD
openssl rand -hex 32   # REDIS_PASSWORD
openssl rand -hex 32   # MINIO_ROOT_PASSWORD
openssl rand -hex 32   # JWT_ACCESS_SECRET
openssl rand -hex 32   # JWT_REFRESH_SECRET (must differ from the access secret)
```

Use hex or another URL-safe generator for `POSTGRES_PASSWORD`, because it is embedded in `DATABASE_URL`.

Edit `.env`:

| Variable                   | Example                                                          | Notes                                      |
| -------------------------- | ---------------------------------------------------------------- | ------------------------------------------ |
| `NODE_ENV`                 | `production`                                                     |                                            |
| `DATABASE_URL`             | `postgresql://user:hex@localhost:5432/pharmacy_db?schema=public` | Use the generated password                 |
| `REDIS_HOST`               | `localhost`                                                      |                                            |
| `REDIS_PASSWORD`           | generated                                                        | Must match the Compose value               |
| `MINIO_ENDPOINT`           | `files.example.com`                                              | Must be browser-reachable, see 6.3         |
| `MINIO_PORT`               | `443`                                                            |                                            |
| `MINIO_USE_SSL`            | `true`                                                           |                                            |
| `MINIO_ROOT_USER`          | `pharmacy_minio_admin`                                           |                                            |
| `MINIO_ROOT_PASSWORD`      | generated                                                        |                                            |
| `MINIO_SERVER_SIDE_ENCRYPTION` | `AES256` or `aws:kms`                                        | Server-side prescription file encryption   |
| `MINIO_KMS_KEY_ID`         | KMS ARN (optional)                                               | Key ID when using `aws:kms`                |
| `MINIO_KMS_SECRET_KEY`     | `key-name:base64-32bytes`                                        | MinIO standalone KMS key (if self-hosted)   |
| `CORS_ORIGIN`              | `https://app.example.com`                                        | Exact web origin                           |
| `WEB_ORIGIN`               | `https://app.example.com`                                        |                                            |
| `API_ORIGIN`               | `https://api.example.com`                                        |                                            |
| `JWT_ACCESS_SECRET`        | generated                                                        | 32+ characters or the API refuses to start |
| `JWT_REFRESH_SECRET`       | generated                                                        | 32+ characters, different from access      |
| `MAIL_PROVIDER`            | `brevo`                                                          | Production email                           |
| `BREVO_API_KEY`            | `xkeysib-...`                                                    | Required for customer OTP email            |
| `MAIL_FROM_EMAIL`          | `no-reply@example.com`                                           | Must be a verified Brevo sender            |
| `DEMO_OTP_ENABLED`         | `false`                                                          | Never enable in production                 |
| `PRESCRIPTION_AI_PROVIDER` | `mock` or `gemini`                                               | `gemini` requires `GEMINI_API_KEY`         |
| `PORT`                     | `3001`                                                           | API port                                   |

### 6.2 Bind infrastructure ports to loopback

The existing Compose file publishes PostgreSQL, Redis, and MinIO to all host interfaces. On a production server, edit `infrastructure/docker/docker-compose.yml` so each published port is prefixed with `127.0.0.1`.

Change these mappings:

```yaml
# postgres
- '127.0.0.1:${POSTGRES_PORT:-5432}:5432'

# redis
- '127.0.0.1:${REDIS_PORT:-6379}:6379'

# minio
- '127.0.0.1:${MINIO_PORT:-9000}:9000'
- '127.0.0.1:${MINIO_CONSOLE_PORT:-9001}:9001'
```

Caddy and the host-run API can still reach these ports on `127.0.0.1`.

### 6.3 Why MinIO uses the public `files` domain

Presigned prescription URLs are generated from `MINIO_ENDPOINT`. If it is set to `localhost` or a container name, the browser receives a URL it cannot resolve.

Use `MINIO_ENDPOINT=files.example.com`, `MINIO_PORT=443`, `MINIO_USE_SSL=true`. Caddy proxies `files.example.com` to `127.0.0.1:9000`, so both uploads (server-side) and downloads (browser-side) work.

This assumes the server can reach `files.example.com:443`, which normally hairpins through public DNS and Caddy. Test it during acceptance. If hairpin routing is unavailable, use split-horizon DNS or an external S3-compatible endpoint.

### 6.4 Configure the web build variable

`NEXT_PUBLIC_API_URL` is inlined at build time. Create a web-only environment file:

```bash
cat > /opt/pharmacy-platform/apps/web/.env.production <<'EOF'
NEXT_PUBLIC_API_URL=https://api.example.com
EOF
```

The API clients append `/api/v1`, so this value must be the origin only.

---

## 7. Start infrastructure

```bash
cd /opt/pharmacy-platform
pnpm infra:up
```

Verify:

```bash
docker compose --env-file .env -f infrastructure/docker/docker-compose.yml ps
```

PostgreSQL, Redis, and MinIO should be `healthy`.

All transactional emails are dispatched via Brevo (`smtp-relay.brevo.com:587`). Ensure `BREVO_SMTP_USER` and `BREVO_SMTP_KEY` are configured in `.env`.

---

## 8. Install and build the applications

```bash
cd /opt/pharmacy-platform
pnpm install --frozen-lockfile
pnpm --filter @pharmacy/api exec prisma generate
NEXT_PUBLIC_API_URL=https://api.example.com pnpm build
```

The root build compiles shared packages, the NestJS API, and the Next.js app in the required order. The build can take several minutes.

If you change `API_DOMAIN` later, rebuild the web app so the public API URL is re-inlined.

---

## 9. Apply database migrations

```bash
cd /opt/pharmacy-platform
set -a
source .env
set +a

pnpm --filter @pharmacy/api exec prisma migrate deploy
```

This applies existing migrations only. Do not use `prisma migrate dev` in production.

**Never run `pnpm db:seed` against production.** The seed creates demo accounts with known credentials and realistic demo data.

---

## 10. Create the first administrator

There is no production seed. Create the account directly with Prisma and Argon2id, using the compiled application dependencies.

```bash
cd /opt/pharmacy-platform/apps/api
set -a
source /opt/pharmacy-platform/.env
set +a

read -rsp "Admin password: " ADMIN_PASSWORD; echo

ADMIN_EMAIL="admin@yourdomain.com" \
ADMIN_PASSWORD="$ADMIN_PASSWORD" \
ADMIN_ROLE="ADMIN" \
node <<'NODE'
const { PrismaClient, UserRole, UserStatus } = require('@prisma/client');
const argon2 = require('argon2');

const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || '';
const roleName = (process.env.ADMIN_ROLE || 'ADMIN').toUpperCase();

if (!email || !password || password.length < 12) {
  console.error('ADMIN_EMAIL and a password of at least 12 characters are required.');
  process.exit(1);
}

const role = UserRole.ADMIN;
const prisma = new PrismaClient();

(async () => {
  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  const user = await prisma.user.upsert({
    where: { email },
    update: { role, status: UserStatus.ACTIVE, passwordHash },
    create: { email, role, status: UserStatus.ACTIVE, passwordHash },
  });

  console.log(`Account ready: ${user.email} (${user.role})`);
  await prisma.$disconnect();
})().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
NODE

unset ADMIN_PASSWORD
```

Re-running the block rotates the password for an existing account.

---

## 11. Install and configure Caddy

Caddy provides automatic HTTPS and proxies the three hostnames.

```bash
sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt-get update
sudo apt-get install -y caddy
```

Create `/etc/caddy/Caddyfile`:

```caddyfile
{
	email ops@example.com
}

app.example.com {
	encode zstd gzip
	reverse_proxy 127.0.0.1:3000
}

api.example.com {
	encode zstd gzip
	reverse_proxy 127.0.0.1:3001
}

files.example.com {
	encode zstd gzip
	reverse_proxy 127.0.0.1:9000
}
```

Validate and reload:

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
sudo systemctl status caddy --no-pager
```

Caddy obtains and renews certificates automatically. Keep ports `80` and `443` reachable.

To hide Swagger publicly, add this to the `api.example.com` block:

```caddyfile
@docs path /api/docs*
respond @docs 404
```

---

## 12. Run the apps with systemd

### 12.1 API service

Create `/etc/systemd/system/pharmacy-api.service`:

```ini
[Unit]
Description=Pharmacy Platform API
After=network-online.target docker.service
Wants=network-online.target
Requires=docker.service

[Service]
Type=simple
User=deploy
Group=deploy
WorkingDirectory=/opt/pharmacy-platform/apps/api
EnvironmentFile=/opt/pharmacy-platform/.env
Environment=NODE_ENV=production
ExecStart=/usr/bin/node /opt/pharmacy-platform/apps/api/dist/main.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true

[Install]
WantedBy=multi-user.target
```

### 12.2 Web service

Create `/etc/systemd/system/pharmacy-web.service`:

```ini
[Unit]
Description=Pharmacy Platform Web
After=network-online.target pharmacy-api.service
Wants=network-online.target pharmacy-api.service

[Service]
Type=simple
User=deploy
Group=deploy
WorkingDirectory=/opt/pharmacy-platform/apps/web
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/node /opt/pharmacy-platform/apps/web/node_modules/next/dist/bin/next start -p 3000 -H 127.0.0.1
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true

[Install]
WantedBy=multi-user.target
```

### 12.3 Enable and start

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now pharmacy-api pharmacy-web
sudo systemctl status pharmacy-api pharmacy-web --no-pager
```

Follow logs:

```bash
journalctl -u pharmacy-api -f
journalctl -u pharmacy-web -f
```

The API reads `.env` from the service environment and also from `../../.env` relative to its working directory. Keep `/opt/pharmacy-platform/.env` as the single source of truth.

The API binds port `3001` on all interfaces, but UFW allows only `22`, `80`, and `443`. Confirm `3001` is not reachable from outside.

---

## 13. Verify the deployment

### 13.1 Health and portals

```bash
curl -fsS https://api.example.com/api/v1/health
```

Expected:

```json
{
  "status": "ok",
  "service": "pharmacy-api",
  "dependencies": { "database": "ok", "redis": "ok" }
}
```

Open:

- `https://app.example.com` — portal selector
- `https://api.example.com/api/docs` — Swagger UI (unless blocked)

### 13.2 End-to-end acceptance

1. Sign in to the admin portal and confirm the dashboard loads.
2. Sign in as staff and open the inventory page.
3. Create a customer account and request an email OTP. Confirm delivery via Brevo.
4. Upload a prescription as the customer.
5. Confirm the AI extraction job completes (mock or Gemini).
6. Review and quote the prescription as a pharmacist.
7. Accept the quote, pay with the mock UPI/COD flow, and confirm routing assigns a store.
8. Pick, pack, and hand over the order as staff.
9. Confirm the invoice and H1 register entry for an H1 medicine.
10. Open a presigned prescription URL in the browser.

### 13.3 MinIO console

The console is bound to `127.0.0.1:9001`. Open an SSH tunnel:

```bash
ssh -L 9001:127.0.0.1:9001 deploy@SERVER_IP
```

Browse `http://localhost:9001` with `MINIO_ROOT_USER` and `MINIO_ROOT_PASSWORD`, then close the tunnel.

---

## 14. Configure email (Brevo)

Customer login uses email OTP. Staff and admin login use passwords.

1. Verify `MAIL_FROM_EMAIL` in Brevo, or authenticate the sending domain.
2. Publish SPF and DKIM records at your DNS provider.
3. Create a Brevo API key and set `BREVO_API_KEY` in `.env`.
4. Set `MAIL_PROVIDER=brevo` and restart the API:

```bash
sudo systemctl restart pharmacy-api
```

5. Request a customer OTP and confirm delivery.

Keep `DEMO_OTP_ENABLED=false`. With the demo bypass enabled, any address in `DEMO_OTP_EMAILS` can log in with the fixed code.

---

## 15. Configure AI (optional)

The platform runs with the deterministic mock provider by default.

To use Gemini, set:

```dotenv
PRESCRIPTION_AI_PROVIDER=gemini
GEMINI_API_KEY=your-key
GEMINI_MODEL=gemini-2.5-flash
```

Restart the API:

```bash
sudo systemctl restart pharmacy-api
```

AI output is always a draft. It cannot approve prescriptions, dispatch orders, or change regulatory schedules.

---

## 16. Backups and restore

### 16.1 Create a backup script

```bash
cd /opt/pharmacy-platform
mkdir -p scripts backups

cat > scripts/backup.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

cd /opt/pharmacy-platform
set -a
source .env
set +a

COMPOSE=(docker compose --env-file .env -f infrastructure/docker/docker-compose.yml)
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_ROOT="/opt/pharmacy-platform/backups"
BACKUP_DIR="$BACKUP_ROOT/$STAMP"

mkdir -p "$BACKUP_DIR"

echo "[backup] PostgreSQL"
"${COMPOSE[@]}" exec -T postgres \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > "$BACKUP_DIR/postgres.dump"

echo "[backup] MinIO volume"
docker run --rm \
  -v pharmacy_minio_data:/data:ro \
  -v "$BACKUP_DIR:/backup" \
  alpine:3.20 sh -c 'tar czf /backup/minio-data.tar.gz -C /data .'

echo "[backup] Retention (14 days)"
find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -mtime +14 -exec rm -rf {} +

echo "[backup] Done: $BACKUP_DIR"
EOF

chmod +x scripts/backup.sh
./scripts/backup.sh
```

The MinIO volume name is defined explicitly in the existing Compose file as `pharmacy_minio_data`.

### 16.2 Schedule daily backups

```bash
sudo crontab -u deploy -e
```

Add:

```cron
0 2 * * * /opt/pharmacy-platform/scripts/backup.sh >> /var/log/pharmacy-backup.log 2>&1
```

Copy backups off the VPS with `rsync`, `rclone`, or provider snapshots. A backup stored only on the same disk is not a backup.

### 16.3 Restore

Stop the app processes first:

```bash
cd /opt/pharmacy-platform
set -a
source .env
set +a

COMPOSE=(docker compose --env-file .env -f infrastructure/docker/docker-compose.yml)
BACKUP_DIR=/opt/pharmacy-platform/backups/YYYYMMDD-HHMMSS

sudo systemctl stop pharmacy-web pharmacy-api

"${COMPOSE[@]}" exec -T postgres \
  pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --single-transaction \
  < "$BACKUP_DIR/postgres.dump"

docker run --rm \
  -v pharmacy_minio_data:/data \
  -v "$BACKUP_DIR:/backup:ro" \
  alpine:3.20 sh -c 'rm -rf /data/* && tar xzf /backup/minio-data.tar.gz -C /data'

sudo systemctl start pharmacy-api pharmacy-web
```

Run the acceptance checks again after restoring.

---

## 17. Updates and rollback

### 17.1 Deploy a new release

```bash
cd /opt/pharmacy-platform
./scripts/backup.sh

git fetch --tags
git checkout v1.2.3   # replace with the target tag

pnpm install --frozen-lockfile
pnpm --filter @pharmacy/api exec prisma generate
NEXT_PUBLIC_API_URL=https://api.example.com pnpm build

set -a
source .env
set +a
pnpm --filter @pharmacy/api exec prisma migrate deploy

sudo systemctl restart pharmacy-api pharmacy-web
curl -fsS https://api.example.com/api/v1/health
```

Database migrations are forward-only. Take a backup before every release.

### 17.2 Roll back application code

```bash
cd /opt/pharmacy-platform
git checkout v1.2.2
pnpm install --frozen-lockfile
NEXT_PUBLIC_API_URL=https://api.example.com pnpm build
sudo systemctl restart pharmacy-api pharmacy-web
```

If the newer release applied an incompatible migration, code rollback alone is not enough. Restore the pre-release database backup.

---

## 18. Operations

### Common commands

```bash
# Infrastructure
docker compose --env-file .env -f infrastructure/docker/docker-compose.yml ps
docker compose --env-file .env -f infrastructure/docker/docker-compose.yml logs -f postgres

# Applications
sudo systemctl status pharmacy-api pharmacy-web --no-pager
sudo systemctl restart pharmacy-api pharmacy-web
journalctl -u pharmacy-api --since "30 minutes ago"
journalctl -u pharmacy-web --since "30 minutes ago"

# TLS
sudo systemctl status caddy --no-pager
sudo caddy validate --config /etc/caddy/Caddyfile
```

### Monitoring

- Poll `https://api.example.com/api/v1/health` from an external uptime monitor.
- The endpoint returns HTTP `503` when PostgreSQL or Redis is unhealthy.
- Monitor disk usage, Docker volumes, and the MinIO data volume.
- Caddy renews TLS certificates automatically; keep port `80` reachable.
- Review API logs for repeated `500`, `503`, auth failures, and email errors.

### Log growth

Docker's default JSON log driver can grow without limit. Optionally cap it in `/etc/docker/daemon.json`:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

Then restart Docker during a maintenance window:

```bash
sudo systemctl restart docker
pnpm infra:up
sudo systemctl restart pharmacy-api pharmacy-web
```

Systemd application logs are managed by journald. Check limits with `journalctl --disk-usage` and configure `/etc/systemd/journald.conf` if needed.

### Housekeeping

```bash
docker image prune -f
docker builder prune -f
```

Run monthly or after repeated deployments, not while a build is running.

---

## 19. Security checklist

- [ ] `.env` is mode `600` and never committed
- [ ] All default passwords and JWT secrets replaced
- [ ] `DEMO_OTP_ENABLED=false`
- [ ] SSH password authentication and root login disabled
- [ ] UFW allows only `22`, `80`, `443`
- [ ] PostgreSQL, Redis, and MinIO ports bound to `127.0.0.1`
- [ ] API port `3001` is not reachable from the internet
- [ ] MinIO console reachable only through the loopback SSH tunnel
- [ ] Brevo sender/domain verified; SPF and DKIM published
- [ ] TLS certificates valid for all three hostnames
- [ ] Demo seed not run in production
- [ ] Unique admin and compliance accounts created
- [ ] Backups tested with a restore drill
- [ ] Backups copied off the VPS and encrypted
- [ ] Swagger exposure reviewed (public at `/api/docs` by default)
- [ ] Dependency and OS updates scheduled
- [ ] Compliance rule sets reviewed by a qualified officer
- [ ] Legal, privacy, and pharmacy licensing review completed
- [ ] Incident response and audit-log retention policy defined

---

## 20. Troubleshooting

| Symptom                                            | Likely cause                                                                | Fix                                                                                             |
| -------------------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Caddy cannot issue a certificate                   | DNS not propagated, ports blocked, or another web server on `80/443`        | Check `dig`, UFW, `journalctl -u caddy`; stop host nginx/apache if present                      |
| `502 Bad Gateway` from Caddy                       | App process down or not listening on the expected port                      | `systemctl status pharmacy-web pharmacy-api`; check `journalctl`                                |
| API exits immediately on boot                      | `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` missing or under 32 characters     | Set both and restart                                                                            |
| Login succeeds but the session immediately expires | Web and API on unrelated domains, or HTTP instead of HTTPS                  | Keep both under one root domain and use HTTPS                                                   |
| CORS error in browser                              | `CORS_ORIGIN`/`WEB_ORIGIN` mismatch                                         | Correct origins and restart the API                                                             |
| Prescription preview URL does not open             | Browser cannot resolve `files.example.com`, or MinIO endpoint is local      | Verify DNS, Caddy `files` block, and `MINIO_ENDPOINT`                                           |
| API cannot upload to MinIO                         | Server cannot reach `files.example.com:443` (hairpin)                       | Test from the host; use split-horizon DNS or external S3                                        |
| `prisma migrate deploy` fails                      | Database not ready, wrong password, or special characters in `DATABASE_URL` | Use hex passwords; check `docker compose logs postgres`                                         |
| Web build runs out of memory                       | Next.js build on a small VPS                                                | Add swap or build on a larger machine/CI                                                        |
| Customer OTP email never arrives                   | Brevo key missing, sender unverified, or `MAIL_PROVIDER` wrong              | Check `journalctl -u pharmacy-api`, Brevo activity, SPF/DKIM                                    |
| Upload returns `413`                               | Reverse-proxy or CDN request-size limit                                     | Raise the limit or upload a smaller file                                                        |
| MinIO container reports unhealthy                  | `mc ready local` cannot reach the server                                    | Check `docker compose logs minio`; verify credentials                                           |
| `next: not found` in the web service               | Dependencies not installed or `next start` path wrong                       | Run `pnpm install --frozen-lockfile`; confirm `apps/web/node_modules/next/dist/bin/next` exists |
| Disk fills up during deployments                   | Old images, build cache, or backups                                         | Prune images/build cache, rotate backups, expand disk                                           |

Useful diagnostics:

```bash
docker compose --env-file .env -f infrastructure/docker/docker-compose.yml ps
docker compose --env-file .env -f infrastructure/docker/docker-compose.yml logs --tail=200 postgres
sudo systemctl status pharmacy-api pharmacy-web caddy --no-pager
journalctl -u pharmacy-api --since "15 minutes ago"
curl -fsS https://api.example.com/api/v1/health
df -h
docker system df
```

Do not print `.env` or process environments into shared logs; they contain secrets.

---

## 21. Scaling beyond one server

When a single VPS is no longer sufficient:

1. Move PostgreSQL to a managed service with point-in-time recovery.
2. Move Redis to a managed instance with persistence and eviction policies.
3. Move prescription storage from single-node MinIO to AWS S3/GCS using configured KMS encryption (`MINIO_SERVER_SIDE_ENCRYPTION=aws:kms` and `MINIO_KMS_KEY_ID`), lifecycle rules, and a public presigned endpoint.
4. Split BullMQ workers from the API process and scale them independently.
5. Run multiple API replicas behind a load balancer; sessions and OTP state are already in Redis.
6. Replace the API's startup migration step with a separate release job.
7. Add centralized logs, metrics, tracing, alerting, and a WAF/edge rate limiter.
8. Add a CDN for static assets and, if appropriate, upload traffic.
9. Define RPO/RTO targets and test disaster recovery regularly.

---

## 22. Command cheat sheet

```bash
# Infrastructure
pnpm infra:up
docker compose --env-file .env -f infrastructure/docker/docker-compose.yml ps

# Build
cd /opt/pharmacy-platform
pnpm install --frozen-lockfile
NEXT_PUBLIC_API_URL=https://api.example.com pnpm build

# Migrations
set -a; source .env; set +a
pnpm --filter @pharmacy/api exec prisma migrate deploy

# Services
sudo systemctl status pharmacy-api pharmacy-web caddy --no-pager
sudo systemctl restart pharmacy-api pharmacy-web

# Health
curl -fsS https://api.example.com/api/v1/health

# Backup
./scripts/backup.sh
```
