# Option A: Move code from hyperlabel-spec into tip (one repo, one set of keys)

Goal: Use **tip** as the single repo. All secrets stay in tip; no copying keys to hyperlabel-spec.

---

## Option 1: Run via GitHub Action (recommended)

1. **Add a secret in hyperlabel-spec**  
   Repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**  
   - **Name:** `TIP_REPO_TOKEN`  
   - **Value:** A GitHub PAT (or fine-grained token) with **contents: read + write** on the repo **TIP-LIVE/tip**.  
   - Create at: [GitHub → Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens) (classic) or Fine-grained tokens.

2. **Run the workflow**  
   In **hyperlabel-spec**: **Actions** → **Migrate code to tip repo** → **Run workflow**.

3. The workflow will checkout both repos, copy `app/` and `.github/workflows/` from hyperlabel-spec into tip, then commit and push to **tip**’s `main`. Deploy will run from **tip** using the secrets already in that repo.

---

## Option 2: Run the script locally

## 1. Clone tip (if you don’t have it)

```bash
cd ~/Documents  # or wherever you keep repos
git clone https://github.com/TIP-LIVE/tip.git
cd tip
git checkout main
```

## 2. Copy code from hyperlabel-spec into tip

From the **hyperlabel-spec** repo (this repo), run the migration script. It copies the app and workflows into the tip repo.

**Option A – Run the script (recommended)**

```bash
# From hyperlabel-spec repo (this folder)
cd /Users/denyschumak/Documents/HyperLabel
chmod +x scripts/migrate-code-to-tip.sh
./scripts/migrate-code-to-tip.sh /path/to/tip
# Example if tip is next to HyperLabel:
./scripts/migrate-code-to-tip.sh ../tip
```

**Option B – Manual copy**

1. In **tip**, remove or rename the old app (if any), e.g. `rm -rf app` or `mv app app.old`.
2. Copy from **hyperlabel-spec** into **tip**:
   - `app/` → `tip/app/` (entire Next.js app; exclude `app/.next`, `app/node_modules`, `app/.env`)
   - `.github/workflows/deploy.yml` → `tip/.github/workflows/deploy.yml`
   - `.github/workflows/run-migration.yml` → `tip/.github/workflows/run-migration.yml`
   - `.github/workflows/ci.yml` → `tip/.github/workflows/ci.yml` (if tip doesn’t have one or you want to replace)
3. Do **not** copy `.env` or secrets. tip will use its own GitHub Actions secrets and Vercel env.

## 3. Align tip repo layout with the workflow

The deploy workflow expects:

- Repo root contains an `app/` directory (Next.js app).
- `working-directory: ./app` and `app/package-lock.json` for install/build.

So in **tip** you should have:

- `tip/app/` – Next.js app (from hyperlabel-spec).
- `tip/.github/workflows/deploy.yml` – Deploy to Vercel (from hyperlabel-spec).
- `tip/.github/workflows/run-migration.yml` – Run migration (from hyperlabel-spec).

If tip currently has the app at repo root (no `app/` subfolder), either:

- Move everything into `app/` and point the workflow at `./app`, or  
- Change the workflow to use repo root (remove `working-directory: ./app`, adjust paths). The script assumes the workflow uses `./app`.

## 4. Vercel

- In Vercel, point the **tip.live** project to the **tip** repo (if it isn’t already).
- Ensure production branch is `main`.
- Env vars stay in Vercel; no need to move keys to another repo.

## 5. Commit and push from tip

```bash
cd /path/to/tip
git add app .github
git status
git commit -m "chore: move app and workflows from hyperlabel-spec (single repo)"
git push origin main
```

Deploy will run from **tip** using the secrets already in **tip**.

## 6. (Optional) Archive hyperlabel-spec

- GitHub: **tip** → Settings → General → Archive repository (or leave it and just stop using it for deploy).
- Or keep hyperlabel-spec as read-only spec and do all development in **tip**.

## Summary

| Before | After |
|--------|--------|
| Code in hyperlabel-spec, keys in tip | Code and keys both in **tip** |
| Deploy from hyperlabel-spec (needs keys there) | Deploy from **tip** (keys already there) |
| Two repos to maintain | One repo (**tip**) |

No need to copy or move keys; you only move code into the repo that already has the secrets.
