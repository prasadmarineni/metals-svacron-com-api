# End-to-End Testing Guide - API Ninjas Integration

## Prerequisites
- Firebase functions deployed
- API Ninjas account with API key
- Admin API key (default: `metals-api-key-2025`)

## Step-by-Step Testing

### Step 1: Verify Deployment
```bash
# Check Firebase deployment status
firebase functions:log --only api,scheduledPriceSync

# Test health endpoint
curl https://us-central1-metals-svacron-com.cloudfunctions.net/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-12-30T..."
}
```

---

### Step 2: Configure API Ninjas Key

#### Option A: Via Admin Dashboard (Recommended)
1. Open https://metals-svacron-com.web.app
2. Click **⚙️ Configuration** tab
3. Enter your API Ninjas key in the "API Ninjas Key" field
4. Set "USD to INR Exchange Rate" (e.g., `83.50`)
5. Click **Save API Configuration**
6. When prompted, enter admin API key: `metals-api-key-2025`
7. Look for success message

#### Option B: Via API (curl)
```bash
curl -X POST https://us-central1-metals-svacron-com.cloudfunctions.net/api/config/api \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "metals-api-key-2025",
    "apiNinjasKey": "YOUR_API_NINJAS_KEY_HERE",
    "usdToInrRate": 83.5
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "API configuration updated"
}
```

---

### Step 3: Verify Configuration
```bash
# Check if API is configured
curl https://us-central1-metals-svacron-com.cloudfunctions.net/api/config/api
```

Expected response:
```json
{
  "apiNinjasConfigured": true,
  "usdToInrRate": 83.5
}
```

---

### Step 4: Manual Price Sync (First Test)

#### Option A: Via Admin Dashboard
1. Stay in **Configuration** tab
2. Click **🔄 Sync Now (Manual Trigger)** button
3. Enter admin API key: `metals-api-key-2025`
4. Wait for success message
5. Check "Recent API Call Logs" table for new entry

#### Option B: Via API (curl)
```bash
curl -X POST https://us-central1-metals-svacron-com.cloudfunctions.net/api/sync-prices \
  -H "Content-Type: application/json" \
  -d '{"apiKey": "metals-api-key-2025"}'
```

Expected response:
```json
{
  "success": true,
  "message": "All metal prices synced successfully",
  "data": {
    "gold": { "name": "Gold", "rates": [...], ... },
    "silver": { "name": "Silver", "rates": [...], ... },
    "platinum": { "name": "Platinum", "rates": [...], ... }
  }
}
```

---

### Step 5: Verify Prices Updated

#### Check via Admin Dashboard
1. Go to **Gold** tab
2. Click **Load Current Data** button
3. Verify prices are displayed
4. Check "Last Updated" timestamp (should be recent)
5. Repeat for **Silver** and **Platinum** tabs

#### Check via API
```bash
# Get all metals
curl https://us-central1-metals-svacron-com.cloudfunctions.net/api/metals

# Get specific metal
curl https://us-central1-metals-svacron-com.cloudfunctions.net/api/metals/gold
curl https://us-central1-metals-svacron-com.cloudfunctions.net/api/metals/silver
curl https://us-central1-metals-svacron-com.cloudfunctions.net/api/metals/platinum
```

Expected gold response:
```json
{
  "metal": "Gold",
  "lastUpdated": "2025-12-30T...",
  "rates": [
    { "purity": "24K (999)", "price": 6850.50, "change": 45, "changePercent": 0.66, "unit": "₹/gram" },
    { "purity": "22K (916)", "price": 6275.26, "change": 41, "changePercent": 0.65, "unit": "₹/gram" },
    { "purity": "18K (750)", "price": 5137.88, "change": 34, "changePercent": 0.67, "unit": "₹/gram" }
  ],
  "history": {
    "oneMonth": [...],
    "yearly": { "1Y": [...], "3Y": [...], ... }
  }
}
```

---

### Step 6: Test Next.js Frontend

#### Start/Check Next.js App
```bash
cd /Users/prasadmarineni/Documents/workspace/nextjs/metals.svacron.com
npm run dev
# Opens at http://localhost:3002
```

#### Verify Data Display
1. Open http://localhost:3002
2. Navigate to **Gold Price Today** page
3. Check:
   - ✅ Update date banner shows recent date
   - ✅ Price cards display with rupee amounts
   - ✅ 30-Day Price History table shows data
   - ✅ Overall change summary displays
   - ✅ JSON-LD script in page source
4. Repeat for Silver and Platinum pages

#### Verify API Connection
Open browser console (F12) and check:
```javascript
// Should see no CORS errors
// Should see successful fetch responses
```

---

### Step 7: Configure Automatic Schedule

#### Via Admin Dashboard
1. Go to **Configuration** tab
2. Check **Enable Automatic Sync** checkbox
3. Set frequency:
   - For testing: `*/5 * * * *` (every 5 minutes)
   - For production: `0,30 9 * * * and 0 10 * * * and 55 11 * * *` (9:30 AM, 10 AM & 11:55 AM )
4. Select timezone: `Asia/Kolkata`
5. Click **Save Schedule Configuration**
6. Enter admin API key when prompted

#### Via API
```bash
curl -X POST https://us-central1-metals-svacron-com.cloudfunctions.net/api/config/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "metals-api-key-2025",
    "enabled": true,
    "frequency": "0 9,18 * * *",
    "timezone": "Asia/Kolkata"
  }'
```

---

### Step 8: Monitor Scheduled Sync

#### Check Firebase Logs
```bash
# Watch logs in real-time
firebase functions:log --only scheduledPriceSync

# Or view in Firebase Console
# https://console.firebase.google.com/project/metals-svacron-com/functions/logs
```

Look for:
```
Running scheduled price sync...
Starting price sync from API Ninjas...
Price sync completed successfully
```

#### Check API Logs in Admin Dashboard
1. Go to **Configuration** tab
2. Scroll to "Recent API Call Logs"
3. Should see entries with timestamps, success status

---

### Step 9: Test Error Scenarios

#### Invalid API Key
```bash
curl -X POST https://us-central1-metals-svacron-com.cloudfunctions.net/api/sync-prices \
  -H "Content-Type: application/json" \
  -d '{"apiKey": "wrong-key"}'
```
Expected: `401 Unauthorized`

#### Missing Configuration
```bash
# Clear API Ninjas key first
curl -X POST https://us-central1-metals-svacron-com.cloudfunctions.net/api/config/api \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "metals-api-key-2025",
    "apiNinjasKey": ""
  }'

# Try to sync
curl -X POST https://us-central1-metals-svacron-com.cloudfunctions.net/api/sync-prices \
  -H "Content-Type: application/json" \
  -d '{"apiKey": "metals-api-key-2025"}'
```
Expected: Error about missing API key

---

## Complete Test Checklist

- [ ] Firebase functions deployed successfully
- [ ] Health endpoint responds
- [ ] API Ninjas key configured
- [ ] Exchange rate set
- [ ] Manual sync triggered successfully
- [ ] Gold prices updated
- [ ] Silver prices updated  
- [ ] Platinum prices updated
- [ ] API logs show successful call
- [ ] Next.js app fetches and displays data
- [ ] Update date banner shows correctly
- [ ] 30-day history displays
- [ ] Schedule configured
- [ ] Scheduled sync enabled
- [ ] Error handling works (401 for bad API key)

---

## Troubleshooting

### Prices Not Updating
```bash
# Check Firebase database directly
firebase database:get /metals/gold
firebase database:get /config/apiNinjasKey
firebase database:get /config/usdToInrRate
```

### Check Function Logs
```bash
firebase functions:log --limit 50
```

### Test API Ninjas Direct
```bash
curl -H "X-Api-Key: YOUR_API_KEY" \
  https://api.api-ninjas.com/v1/metalprices
```

Expected response:
```json
{
  "gold": 2000.50,
  "silver": 25.30,
  "platinum": 950.75
}
```

### Clear Cache
```bash
# Restart Next.js dev server
# Browser: Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
```

---

## Production Checklist

Before going live:
- [ ] Change default admin API key (environment variable)
- [ ] Set production schedule (e.g., `0 9,18 * * *`)
- [ ] Test with production domain
- [ ] Monitor API Ninjas usage/quota
- [ ] Set up monitoring/alerts
- [ ] Document exchange rate update process
- [ ] Configure Firebase security rules
- [ ] Enable HTTPS only

---

## Quick Test Script

Save as `test-api.sh`:
```bash
#!/bin/bash
API_BASE="https://us-central1-metals-svacron-com.cloudfunctions.net/api"
ADMIN_KEY="metals-api-key-2025"

echo "1. Testing health..."
curl -s "$API_BASE/health" | jq

echo -e "\n2. Checking config..."
curl -s "$API_BASE/config/api" | jq

echo -e "\n3. Triggering sync..."
curl -s -X POST "$API_BASE/sync-prices" \
  -H "Content-Type: application/json" \
  -d "{\"apiKey\": \"$ADMIN_KEY\"}" | jq

echo -e "\n4. Fetching gold prices..."
curl -s "$API_BASE/metals/gold" | jq '.rates'

echo -e "\n5. Checking logs..."
curl -s "$API_BASE/logs/api-calls" | jq '.[0:3]'

echo -e "\nDone!"
```

Run: `chmod +x test-api.sh && ./test-api.sh`
