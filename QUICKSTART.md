# Quick Start Guide

## 1. Initial Setup (One-time)

```bash
cd /path/to/metals-svacron-com

# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Install dependencies
cd functions && npm install && cd ..
```

## 2. Configure Firebase Project

Edit `.firebaserc` and replace with your Firebase project ID:
```json
{
  "projects": {
    "default": "your-firebase-project-id"
  }
}
```

## 3. Deploy to Firebase

```bash
# Build and deploy everything
firebase deploy
```

This deploys:
- ✅ Cloud Functions (API endpoints)
- ✅ Firebase Hosting (Admin UI)

## 4. Initialize with Data

After deployment, visit your admin URL:
```
https://your-project-id.web.app
```

**Option A: Use Admin UI**
1. Open the admin dashboard
2. Go to Gold/Silver/Platinum tabs
3. Enter API key: `metals-api-key-2025`
4. Fill in prices and click "Update"

**Option B: Use Initialize Endpoint**
```bash
curl -X POST https://your-project-id.web.app/api/initialize \
  -H "Content-Type: application/json" \
  -d '{"apiKey": "metals-api-key-2025"}'
```

## 5. Update Next.js App

In `metals.svacron.com` project:

**Create `.env.local`:**
```env
NEXT_PUBLIC_API_URL=https://your-project-id.web.app/api
```

**Update `metalData.ts`:**
```typescript
// Replace the entire file content with metalData-api.ts
// Or rename metalData-api.ts to metalData.ts
```

**Restart Next.js dev server:**
```bash
npm run dev
```

## 6. Verify Everything Works

### Test API:
```bash
curl https://your-project-id.web.app/api/metals
```

### Test Admin UI:
Open `https://your-project-id.web.app` in browser

### Test Next.js App:
Open `http://localhost:3002` and verify prices load

## 7. Bot Integration

Your bot should POST to:
```
https://your-project-id.web.app/api/update-prices
```

With payload:
```json
{
  "metal": "gold",
  "rates": [
    { "purity": "24K", "price": 6850 },
    { "purity": "22K", "price": 6280 },
    { "purity": "18K", "price": 5140 }
  ],
  "apiKey": "metals-api-key-2025"
}
```

## Common Commands

```bash
# Local development
firebase emulators:start --only functions,hosting

# Deploy functions only
firebase deploy --only functions

# Deploy hosting only
firebase deploy --only hosting

# View logs
firebase functions:log

# Rebuild functions
cd functions && npm run build && cd ..
```

## Default Credentials

- **API Key**: `metals-api-key-2025`
- **Admin URL**: `https://your-project-id.web.app`
- **API Base URL**: `https://your-project-id.web.app/api`

## Need Help?

1. Check Firebase Console: https://console.firebase.google.com
2. View function logs: `firebase functions:log`
3. Test locally: `firebase emulators:start`
4. Read full docs: See README.md
