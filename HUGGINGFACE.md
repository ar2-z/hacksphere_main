# HackSphere — Hugging Face Spaces Deployment Guide (Free, No Card)

## What You Get (Free)
- 16GB RAM (CPU Basic)
- Always-on, no spin-down
- Public URL at `https://<your-username>-<space-name>.hf.space`
- No credit card required
- Automatic redeploy on git push

## Step 1: Create Hugging Face Account
1. Go to https://huggingface.co/join
2. Sign up (free, no card)

## Step 2: Create a New Space
1. Go to https://huggingface.co/new-space
2. Fill in:
   - **Space name:** `hacksphere`
   - **License:** MIT
   - **SDK:** Docker
   - **Visibility:** Public (or Private)
3. Click **Create Space**

## Step 3: Push Your Code
The Space is a git repo. Add it as a remote and push:

```bash
cd hacksphere
git remote add hf https://huggingface.co/spaces/<YOUR_USERNAME>/hacksphere
git push hf main
```

Or upload via the Hugging Face web interface.

## Step 4: Set Environment Variables
In your Space → **Settings** → **Repository Secrets** (or Variables), add:

| Variable | Value |
|----------|-------|
| `SECRET_KEY` | (run `python -c "import secrets; print(secrets.token_hex(32))"` locally) |
| `JWT_SECRET_KEY` | (run again for a different value) |
| `DATABASE_URL` | `sqlite+aiosqlite:///./hacksphere.db` (default, no setup needed) |
| `APP_ENV` | `production` |
| `PORT` | `7860` |
| `CORS_ORIGINS` | `["*"]` |

**Note:** HF Spaces sets `PORT=7860` automatically and the `README.md` already declares `app_port: 7860`.

## Step 5: Wait for Build
- First build takes ~5-8 minutes (Python + Node.js)
- Subsequent builds are faster (cached layers)
- Check the **Logs** tab for build progress

## Step 6: Access Your App
Once built, your app is live at:
```
https://<YOUR_USERNAME>-hacksphere.hf.space
```

## Step 7: Admin Login
- Create an admin account by running `python scripts/seed_admins.py` (password from `ADMIN_PASSWORD` env var, interactive prompt, or auto-generated)
- Login at your Space URL with that account

## Database
By default uses SQLite (file-based, no setup needed). Data persists across restarts on HF Spaces.

### To use PostgreSQL instead:
1. Create a free PostgreSQL at https://neon.tech (no card, 0.5GB)
2. Or https://supabase.com (no card, 500MB)
3. Set `DATABASE_URL` to the connection string
4. The app auto-detects external PostgreSQL and enables SSL

## Updating
Push to your HF Space git remote:
```bash
git push hf main
```
HF Spaces auto-redeploys on push.

## Limitations
- 16GB RAM, 2 vCPU (CPU Basic tier)
- SQLite file storage (switch to cloud PostgreSQL for production)
- Public spaces are visible to everyone
