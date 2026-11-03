# Paddock Parking PMS — deploy (operators)

Same pattern as Phoenix WMS / FMS: nginx + PM2 on EC2, GitHub Actions deploy.

**Do not put passwords, API keys, or SSH keys in this file.**

## Target

| Item | Value |
| --- | --- |
| Public host | `pms.paddockparking.com` |
| App root | `/var/www/paddock-pms` |
| PM2 apps | `paddock-pms-api` · `paddock-pms-web` |
| Local ports | API `4040` · Web `3040` |

## What Nadia needs (GoDaddy DNS)

Send her an **A record destination** = this server’s **public IPv4**:

| Type | Name / Host | Value | TTL |
| --- | --- | --- | --- |
| A | `pms` | `<SERVER_PUBLIC_IP>` | 600 |

That creates `pms.paddockparking.com` → your EC2.

## One-time on the server

```bash
# SSH as deploy user, then:
sudo bash /path/to/cloned/repo/deploy/setup-server.sh
# or after first rsync/clone at /var/www/paddock-pms:
bash /var/www/paddock-pms/deploy/setup-server.sh

# When DNS points at this box:
sudo sed -i 's/PADDOCK_PMS_DOMAIN/pms.paddockparking.com/g' /etc/nginx/sites-available/paddock-pms
sudo ln -sfn /etc/nginx/sites-available/paddock-pms /etc/nginx/sites-enabled/paddock-pms
sudo certbot --nginx -d pms.paddockparking.com
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
