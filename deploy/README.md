# Phoenix Storage Yards PMS — deploy (operators)

Same pattern as Phoenix WMS / FMS: nginx + PM2 on EC2, GitHub Actions deploy.

**Do not put passwords, API keys, or SSH keys in this file.**

## Target

| Item | Value |
| --- | --- |
| Staff host | `pms.phoenixstorageyards.com` (admin: `/login`, `/dashboard`, …) |
| Customer host | `www.phoenixstorageyards.com` (public site + `/portal`, `/book`, …) |
| Legacy host | `pms.paddockparking.com` (older demo docs; same app pattern) |
| App root | `/var/www/paddock-pms` |
| PM2 apps | `paddock-pms-api` · `paddock-pms-web` |
| Local ports | API `4040` · Web `3040` |

## Routes

Fuelcap (FMS) sign-in is `https://…/auth/signin`. This app does not use that path. Staff sign in at `/login`.

| Host | What it is | Paths |
| --- | --- | --- |
| `pms.phoenixstorageyards.com` | Staff | `/login`, `/dashboard`, `/bookings`, `/customers`, `/collections`, `/leases`, `/lots`, `/invoices`, `/notifications`, `/properties`, `/compliance`, `/profile`, `/leads` |
| `www.phoenixstorageyards.com` | Customer website | `/` and `/book` (locations, spots, about, contact, services) |
| `www.phoenixstorageyards.com` | Customer portal | `/portal`, `/portal/invoices`, `/portal/lease`, `/portal/finish` |

`/portal` and `/book` on the staff host send the browser to www. Staff paths on www send the browser to pms. FMS is a different app and is not changed by this file.

## DNS (Nadia — phoenixstorageyards.com)

Both names point at the **same** app server. Nginx uses `server_name` so staff and customer URLs can differ.

| Type | Host | Points to | Use |
| --- | --- | --- | --- |
| A | `pms` | `3.146.118.154` | Staff PMS — `https://pms.phoenixstorageyards.com` |
| A | `www` | `3.146.118.154` | Public + portal — `https://www.phoenixstorageyards.com`, `/portal`, `/book` |

Apex `phoenixstorageyards.com` stays on the main marketing site (unchanged).

On the server after DNS propagates:

- Enable nginx for **both** `pms.phoenixstorageyards.com` and `www.phoenixstorageyards.com` (two `server` blocks or one block with both names — same upstream ports `3040` / `4040`).
- `certbot --nginx -d pms.phoenixstorageyards.com -d www.phoenixstorageyards.com`
- Set API `APP_URL=https://www.phoenixstorageyards.com` so portal invites, invoice emails, and password links use `/portal` on **www**, not pms.

## One-time on the server

```bash
# SSH as deploy user, then:
sudo bash /path/to/cloned/repo/deploy/setup-server.sh
# or after first rsync/clone at /var/www/paddock-pms:
bash /var/www/paddock-pms/deploy/setup-server.sh

# Copy THIS project's vhost only. Do not edit the FMS nginx file.
sudo cp deploy/nginx.paddock-pms.conf /etc/nginx/sites-available/paddock-pms
sudo ln -sfn /etc/nginx/sites-available/paddock-pms /etc/nginx/sites-enabled/paddock-pms
sudo certbot --nginx -d pms.phoenixstorageyards.com -d www.phoenixstorageyards.com
sudo nginx -t && sudo systemctl reload nginx
```

## GitHub Actions secrets

Repo: `Davidmolo/Paddock_Parking` → Settings → Secrets → Actions:

| Secret | Meaning |
| --- | --- |
| `PADDOCK_PMS_HOST` | EC2 public IP or hostname |
| `PADDOCK_PMS_USER` | SSH user (e.g. `ubuntu`) |
| `PADDOCK_PMS_SSH_KEY` | Private key for that user |

Trigger: push to `main`, or **Actions → Deploy Paddock PMS**.

## Manual reload

```bash
bash /var/www/paddock-pms/deploy/deploy.sh
```
