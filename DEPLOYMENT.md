# PlacementHub — Deployment Guide

Backend → **Render** (FastAPI web service)  
Frontend → **Vercel** (Create-React-App static build)  
Database → **MongoDB Atlas**

---

## 0. Prerequisites

- GitHub repo pushed with the latest code.
- MongoDB Atlas cluster with:
  - Database user (username + password).
  - Network access: temporarily whitelist `0.0.0.0/0` (any IP) so Render can connect.
- Accounts on Render.com and Vercel.com.

---

## 1. Deploy the backend on Render

### Option A — one-click via `render.yaml` (Blueprint)

1. In Render dashboard → **New +** → **Blueprint**.
2. Connect this GitHub repo. Render auto-detects `render.yaml`.
3. It will create a web service **placementhub-api**.
4. Fill the env vars when prompted (see list below), then **Apply**.

### Option B — manual web service

1. **New +** → **Web Service** → connect the repo.
2. Settings:
   - **Root Directory**: `backend`
   - **Runtime**: Python 3
   - **Build Command**: `pip install --upgrade pip && pip install -r requirements.txt`
   - **Start Command**: `uvicorn server:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path**: `/api/health`
3. Add environment variables (Settings → Environment):

| Key | Value | Required |
|---|---|---|
| `MONGO_URL` | `mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority` | ✅ |
| `DB_NAME` | `placement-portal` | ✅ |
| `JWT_SECRET` | long random string, e.g. `python -c "import secrets; print(secrets.token_hex(32))"` | ✅ |
| `CORS_ORIGINS` | your Vercel URL(s), comma-separated. E.g. `https://placementhub.vercel.app,http://localhost:3000` | ✅ |
| `GEMINI_API_KEY` | Google AI Studio key | for AI features |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | for uploads |
| `CLOUDINARY_API_KEY` | Cloudinary API key | for uploads |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | for uploads |
| `ADMIN_EMAIL` | admin login email | optional (seeds a super-admin) |
| `ADMIN_PASSWORD` | admin password | optional |
| `PYTHON_VERSION` | `3.11.10` | optional |

4. Deploy. Once live, note the URL (e.g. `https://placementhub-api.onrender.com`).
5. Test:
   ```bash
   curl https://<your-render-url>/api/health
   # → {"status":"ok"}
   ```

---

## 2. Deploy the frontend on Vercel

1. Vercel dashboard → **Add New → Project** → import the GitHub repo.
2. Framework preset: **Create React App**.
3. **Root Directory**: `frontend`
4. Build settings (should auto-detect via `frontend/vercel.json`):
   - Install: `yarn install`
   - Build: `yarn build`
   - Output: `build`
5. Environment Variables:
   - `REACT_APP_BACKEND_URL` = your Render URL, **without** trailing slash and **without** `/api` (e.g. `https://placementhub-api.onrender.com`).
6. Deploy. Note the URL (e.g. `https://placementhub.vercel.app`).

---

## 3. Wire the two together (important!)

After Vercel gives you the frontend URL, go back to Render and update:

- `CORS_ORIGINS` = `https://placementhub.vercel.app,http://localhost:3000`

Save — Render will restart the service. Without this, the browser will block API calls (CORS) and cookies won't be sent.

---

## 4. Post-deploy sanity checks

- Open the Vercel URL in the browser.
- Register a student or log in as admin (if you set `ADMIN_EMAIL`/`ADMIN_PASSWORD`).
- Open DevTools → Network — every request should go to your Render URL and return `200`.
- Cookies (`access_token`) should appear with `Secure; SameSite=None`.

---

## 5. Common issues

| Symptom | Fix |
|---|---|
| `pip` dependency conflict on Render | Make sure `backend/requirements.txt` is the cleaned version in this repo (no futuristic pins). |
| CORS error in browser | Add the exact Vercel URL to `CORS_ORIGINS` on Render, then redeploy. |
| 401 immediately after login | Frontend and backend must both be on HTTPS; cookies use `SameSite=None; Secure`. Check `REACT_APP_BACKEND_URL` starts with `https://`. |
| Mongo connection times out | Whitelist `0.0.0.0/0` in Atlas → Network Access. |
| Render service sleeps (free plan) | First request after idle takes ~30s to spin up. Upgrade plan to remove. |
