# Mark-X Cloudflare Storage Worker

This Cloudflare Worker handles secure file uploads and serves images directly from Cloudflare R2 with global edge caching.

---

## 3-Step Deployment Guide

### 1. Create the R2 Bucket
Run the following command from this directory:
```bash
npx wrangler r2 bucket create mark-x-gallery
```

### 2. (Optional) Set Upload Secret
To protect the `/upload` endpoint, configure an upload secret:
```bash
npx wrangler secret put UPLOAD_SECRET
```
*(Enter any strong secret password of your choice when prompted)*

### 3. Deploy the Worker
Deploy the worker to your Cloudflare account:
```bash
npx wrangler deploy
```

Once deployed, Wrangler will print your worker URL (e.g. `https://mark-x-storage.<your-subdomain>.workers.dev`).

---

## Expo App Configuration

Add the URL and secret to your root `.env.local` (and `.env` in production):

```env
EXPO_PUBLIC_CLOUDFLARE_WORKER_URL=https://mark-x-storage.<your-subdomain>.workers.dev
EXPO_PUBLIC_CLOUDFLARE_UPLOAD_SECRET=your_secret_here
```

Restart your Expo development server (`npx expo start -c`) so the environment variables take effect.
