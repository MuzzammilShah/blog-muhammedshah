---
title: "Building a Zero-Downtime Deployment Pipeline"
description: "From manual SSH deploys to automated, zero-downtime releases."
pubDate: 2026-07-04
thumbnail: "./thumbnail.png"
thumbnailAlt: "Building a Zero-Downtime Deployment Pipeline thumbnail"
author: "Muhammed Shah"
tags: ["DevOps"]
featured: false
draft: false
---

<div align="center" style="font-size: 0.7em; font-style: italic;">Generated using ChatGPT Image 2.0 model with a custom prompt. Inspiration: Iron Man (2008 film).</div>

<br>
<br>

# From Manual SSH Deploys to Zero‑Downtime Auto‑Deployment: A Practical Playbook

Most "how we deploy" posts skip the messy middle part — the days of SSH-ing in, running `npm run build` by hand, and praying nginx reloads cleanly. This post walks through that whole arc, using [Chat AI](https://chat.muhammedshah.com)'s real deployment history as the worked example. The pattern itself — **self-hosted runner + systemd + nginx + atomic symlink releases** — generalizes to almost any small-to-mid FastAPI/Node/React app that doesn't need Kubernetes.

There are three acts: **Prerequisites**, **Manual Deployment**, and **Auto-Deployment**. Each one builds on the last — skipping the manual phase is how you end up automating a process you've never actually debugged by hand.

---

## Part 1 — Prerequisites

Before any automation, you need a server that can actually run the app, and a domain that can actually find it.

**Infrastructure**
- A Linux VM (Ubuntu in this case) with a public IP, reachable on ports **80** and **443**.
- A domain name (`chat.muhammedshah.com`) with an **A record** pointing at that IP. This must be live *before* you request a TLS certificate — Let's Encrypt validates ownership by hitting your server over HTTP.
- Firewall/security-group rules open for inbound 80/443. Port 80 specifically matters because Certbot's HTTP-01 challenge needs it, even if you intend to serve everything over HTTPS afterward.

**System packages** (the project's `deploy.sh` actually checks for these as a pre-flight step rather than assuming):
```bash
nginx
nodejs / npm        (or curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -)
python3
uv                   (curl -LsSf https://astral.sh/uv/install.sh | sh)
rsync, curl, lsof
certbot, python3-certbot-nginx
```

**Application secrets** — a `.env` file with everything the app needs at runtime: database URLs, OAuth client secrets, API keys, a JWT signing secret. This file must exist on the server *before* the service is first started, and it should never be committed to git or shipped through CI artifacts — it lives only on the server.

**A non-root service account.** Don't run your app as root, and don't run it as your personal SSH login user either. A dedicated low-privilege user (e.g. `ai-app`) that owns only the application's own directories limits the blast radius if the app is ever compromised.

This is the boring, unglamorous prep work — but it's also the part that, if skipped, causes 90% of "why won't my deploy script work" debugging sessions.

---

## Part 2 — Manual Deployment (Do It By Hand First)

It's tempting to jump straight to a CI pipeline. Resist that. Walking through deployment by hand — even just once — surfaces every assumption your automation will later need to encode: exact paths, exact service names, exact env vars, exact failure modes.

### Step 1: Get the code on the server
Clone the repo to a known path. Early on, this was literally the developer's home directory (`/home/administrator/Desktop/chat-muhammedshah`) — completely fine for a first pass, but a smell that should change once you automate (more on that below).

### Step 2: Build the frontend
```bash
cd frontend
npm install --legacy-peer-deps
npm run build      # produces frontend/dist/
```

### Step 3: Stand up the backend
```bash
cd backend
uv venv && uv pip install -r requirements.txt
```
Create the production `.env` here with all required secrets (DB connection string, OAuth credentials, JWT secret, etc.).

### Step 4: Wire up a systemd service
Rather than running `uvicorn` in a terminal tab that dies the moment you disconnect, define a systemd unit so the OS manages the process lifecycle (restart on crash, start on boot, structured logging):

```ini
[Unit]
Description=My App Backend (FastAPI + Uvicorn)
After=network.target postgresql.service

[Service]
Type=simple
User=ai-app
Group=ai-app
WorkingDirectory=/path/to/app/backend
EnvironmentFile=/path/to/app/backend/.env
ExecStart=/path/to/app/backend/.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000 --workers 1
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Key choices worth calling out:
- **`--host 127.0.0.1`, not `0.0.0.0`** — the app server is never directly exposed to the internet; only nginx, running locally, talks to it. This is the single biggest "don't accidentally expose your backend" decision in the whole stack.
- **`--workers 1`** — if your persistence layer is SQLite (single-writer), running multiple Uvicorn workers will fight each other over file locks. If your app is stateless or backed by Postgres, you can scale workers freely; this constraint is specific to the app, not a law of nature.
- **`Restart=always`** — if the process crashes (OOM, unhandled exception, bad deploy), systemd brings it back automatically rather than leaving the site dark.

```bash
sudo cp my-app.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now my-app
```

### Step 5: Reverse proxy with nginx
nginx terminates TLS and serves static files; it never lets the public hit Uvicorn directly. A minimal config:

```nginx
server {
    listen 80;
    server_name yourapp.example.com;

    location /.well-known/acme-challenge/ {
        root /var/www/html;          # Certbot needs this writable over plain HTTP
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name yourapp.example.com;

    ssl_certificate     /etc/letsencrypt/live/yourapp.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourapp.example.com/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    # Reverse-proxy API calls to the backend
    location /api/ {
        proxy_pass         http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }

    # Serve the built SPA
    root /path/to/app/frontend/dist;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;   # client-side routing fallback
    }
}
```

A detail worth stealing regardless of project: explicitly **deny access to sensitive file extensions** at the nginx layer, as a defense-in-depth measure in case anything ever ends up in the served directory by mistake:
```nginx
location ~ /\.env  { deny all; return 404; }
location ~ /\.git  { deny all; return 404; }
location ~ \.(py|sh|sql|db)$ { deny all; return 404; }
```

```bash
sudo ln -s /etc/nginx/sites-available/yourapp.example.com /etc/nginx/sites-enabled/
sudo nginx -t       # always test config before reloading
sudo systemctl reload nginx
```

### Step 6: Issue a TLS cert
With DNS pointed correctly and port 80 open:
```bash
sudo certbot --nginx -d yourapp.example.com --non-interactive --agree-tos --email you@example.com
```
Certbot edits the nginx config in place to add the `ssl_certificate` directives, and installs a renewal cron/systemd-timer automatically — no further action needed for renewal.

### Step 7: Verify end-to-end
```bash
systemctl status my-app
curl -I https://yourapp.example.com/api/health
```

**This is what I actually did for the first several days**: deploy manually, watch what breaks, fix it, repeat. Concretely, my early manual passes surfaced real problems worth learning from:
- The redirect URI registered with my OAuth provider had to *exactly* match `https://domain/api/auth/callback`, including scheme — a classic auth integration gotcha.
- `uvicorn --workers 2` initially conflicted with SQLite's single-writer model and had to be dropped to `--workers 1`.
- The nginx `root` directive pointing at `frontend/dist` only works if the build step actually ran first — an ordering dependency that's invisible until you forget it once.

None of these would have been obvious from reading documentation. I came from doing the deploy by hand and watching it fail.

---

## Part 3 — Auto-Deployment via a Self-Hosted GitHub Actions Runner

Once the manual process is proven and stable, the goal is to make "push to `main`" *be* the deploy. The mechanism chosen here — a **self-hosted GitHub Actions runner** — is worth understanding before copying: it inverts the usual SSH-based deploy model.

### Why self-hosted runner instead of SSH?

The conventional approach is: GitHub Actions runs in GitHub's cloud, then SSHes *into* your server to deploy. That requires opening an inbound SSH port and managing a deploy key/secret GitHub can use to reach in.

A self-hosted runner flips this: you install a small agent **on your own server** that polls GitHub over HTTPS for work, asks for jobs, and runs them locally. Communication is **outbound-only** from your server to GitHub — no inbound SSH port needs to exist for deployment purposes at all. The runner has direct filesystem and systemd access because it *is* running on the box.

### Step 1: Register the runner on the server

From the GitHub repo: **Settings → Actions → Runners → New self-hosted runner**, which gives you a one-time registration token. On the server:

```bash
mkdir ~/actions-runner && cd ~/actions-runner
curl -o actions-runner-linux-x64-2.313.0.tar.gz -L \
  https://github.com/actions/runner/releases/download/v2.313.0/actions-runner-linux-x64-2.313.0.tar.gz
tar xzf ./actions-runner-linux-x64-2.313.0.tar.gz

./config.sh --url https://github.com/<org>/<repo> --token <TOKEN_FROM_GITHUB_UI>

sudo ./svc.sh install
sudo ./svc.sh start
```
`svc.sh install` registers the runner as its own systemd service, so it survives reboots and stays listening for jobs continuously.

### Step 2: Grant the runner just enough sudo

The runner process needs to restart your app's systemd service, but it should not have blanket root. Scope it tightly with a sudoers drop-in:
```bash
sudo visudo
# add:
ai-app ALL=(root) NOPASSWD: /bin/systemctl restart my-app
```
This is the **principle of least privilege applied to CI**: the automation can do exactly one privileged thing — restart the service — and nothing else, without a password prompt blocking a non-interactive pipeline.

### Step 3: Split CI from CD

Two separate workflows, two separate concerns:

**`ci.yml`** — runs on every push/PR, on GitHub's hosted `ubuntu-latest` runners (cheap, ephemeral, no production access needed):
```yaml
on:
  push: { branches: [main] }
  pull_request: { branches: [main] }

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - uses: astral-sh/setup-uv@v4
      - run: uv venv && source .venv/bin/activate && uv pip install -r requirements.txt ruff bandit
      - run: ruff check . && ruff format --check .
      - run: bandit -r . -x ./.venv,./*test*.py
  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20" }
      - run: npm install --legacy-peer-deps && npm run lint && npm run build && npm audit
```
This catches lint failures, formatting drift, known-vulnerable dependencies, and basic security smells (`bandit`) *before* anything touches production — and it costs nothing to run on every PR since it's not on your hardware.

**`deploy.yml`** — runs only on `main`, and explicitly on the **self-hosted** runner:
```yaml
on:
  push: { branches: [main] }
  workflow_dispatch:
    inputs:
      environment:
        type: choice
        default: sandbox
        options: [sandbox, production]

jobs:
  deploy:
    runs-on: self-hosted
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "22.12", cache: "npm" }
      - run: |
          chmod +x deploy/optimized-deploy.sh
          TARGET="${{ github.event.inputs.environment || 'production' }}"
          ./deploy/optimized-deploy.sh "$TARGET"
```
The `workflow_dispatch` block is a nice-to-have: it lets a developer manually trigger a deploy of a *specific feature branch* to a sandbox environment from the GitHub Actions UI, without touching `main` — useful for testing in a production-like setting before merging.

### Step 4: Separate the build path from the runtime path

This is the detail that separates "automated deploy" from "automated deploy that actually works reliably," and it's the single biggest lesson from this project's real history.

Early automation pointed `rsync --delete` straight at the git checkout directory — the same place the runner does its build. The first deploy worked. The second deploy's `rsync --delete` wiped out the previous build's artifacts *while also* deleting unrelated files, including `.git` itself, because frontend and backend sync targets weren't cleanly separated. The fix was structural, not a one-line patch: **never run the app out of the directory the CI checkout lives in.**

```
~/actions-runner/_work/my-app/      ← ephemeral build workspace (git checkout, node_modules, build output)
/opt/my-app/                        ← persistent runtime path, owned by the app's service user
```

The deploy script's job becomes: build in the ephemeral workspace, then **copy only the finished artifacts** (compiled frontend, `.py` source, `requirements.txt`) into the runtime path — never the other way around, never with `--delete` against a shared parent directory.

### Step 5: Make releases atomic with a symlink swap

The simplest version of "copy build output into the runtime path" still has a window where the site is half-old, half-new code while files are copied. The fix is a release/symlink pattern, well-known from tools like Capistrano, reimplemented here in plain bash:

```
/opt/my-app/
├── .env                          ← persistent secret, never touched by deploys
├── releases/
│   ├── 20260417_221500/
│   ├── 20260417_223000/
│   └── 20260421_114900/         ← newest build, fully prepared
└── current → releases/20260421_114900/   ← symlink, swapped atomically
```

The deploy script:
1. Builds the frontend and rsyncs backend source into a new **timestamped** release folder — never touching the currently-live one.
2. Symlinks the release's `.env` to the persistent one outside the releases tree (`ln -s /opt/my-app/.env releases/<ts>/backend/.env`) so secrets survive across deploys without being copied repeatedly.
3. Creates a fresh virtualenv *inside that release folder* and installs dependencies (`uv venv --python "$(which python3)" .venv && uv pip install -r requirements.txt`) — isolating each release's dependency set from every other.
4. Fixes ownership (`chown -R ai-app:ai-app`) since the runner often executes as a different user than the one the app runs as.
5. **Swaps the symlink in one filesystem operation**: `ln -sfn releases/<ts> current`. This is the atomic step — there is no instant where `current` points at a half-written directory.
6. Restarts the systemd service, whose `WorkingDirectory` and `ExecStart` both point at `current/...`, so the restart picks up the new code immediately.
7. **Health-checks** the new release (`curl` against a known endpoint) and prints a rollback command if it fails, rather than silently leaving a broken deploy live.
8. Prunes old releases, keeping a handful (e.g. the last 5) so rollback is just re-pointing the symlink — no rebuild required:
   ```bash
   sudo -u ai-app ln -sfn /opt/my-app/releases/<previous_ts> /opt/my-app/current
   sudo systemctl restart my-app
   ```

systemd's unit file needs to point at the **stable symlink path**, never a timestamped folder directly:
```ini
WorkingDirectory=/opt/my-app/current/backend
ExecStart=/opt/my-app/current/backend/.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
```

### Step 6: Tidy up permission edge cases

Two failure modes are common enough to call out explicitly, because they're easy to hit and non-obvious to diagnose:

- **Ownership mismatches.** If the self-hosted runner's service account differs from the app's service account, files written during the build (owned by the runner) won't be readable/writable by the app process after the symlink swap, unless you explicitly `chown` them to the app user as part of the deploy script — and that `chown` itself may need `sudo` if the runner doesn't own the target directory outright.
- **Virtualenv interpreter paths.** Tools like `uv venv` can bake in an interpreter path that's only valid for the user/context that created it. Pinning explicitly (`uv venv --python "$(which python3)" .venv`) avoids subtle "works when I build it, breaks when the service starts it" failures.

Both are small, one-line fixes once identified — but they only surface after you've actually run the automated pipeline a few times in anger, which is exactly why the manual phase (Part 2) and a sandbox environment matter: you want to hit these on a non-critical environment first.

---

## The Shape of the Final System

```
Developer pushes to main
        │
        ▼
┌───────────────────┐     ┌─────────────────────────────────┐
│   ci.yml          │     │   deploy.yml                    │
│   ubuntu-latest   │     │   runs-on: self-hosted          │
│   lint/test/audit │     │   builds + atomically deploys   │
└───────────────────┘     └─────────────────────────────────┘
                                          │
                                          ▼
                          /opt/my-app/releases/<timestamp>/
                                          │  (ln -sfn — atomic)
                                          ▼
                          /opt/my-app/current  ──▶  systemd  ──▶  nginx (TLS) ──▶ users
```

What makes this approach attractive for a project at this scale: **no containers, no orchestrator, no SSH keys to rotate** — just bash, systemd, and nginx, all things a single engineer can fully understand and debug at 2am. It trades some of the elasticity of Kubernetes/Docker-based deploys for radical operational simplicity, which is the right trade for a single-server app that doesn't need to scale horizontally.

The general lesson, independent of any specific tech choice: **automate the deploy you've already done by hand, not the deploy you imagine you'll do.** Every hardening step here — the atomic symlink swap, the ownership fixes, the separated build/runtime paths — was a direct response to a concrete failure that manual or early-automated deploys actually produced, not a hypothetical one anticipated in advance.
