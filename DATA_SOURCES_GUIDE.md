# Metal Price Data Sources - Complete Guide

## 📊 Available Options

The metals-svacron-com API supports **4 different data sources** for fetching metal prices:

| # | Source | Type | Status | Speed | Reliability | Use In Production |
|---|--------|------|--------|-------|-------------|-------------------|
| 1 | **GoodReturns (Puppeteer)** | Web Scraper | ✅ Working | ~30s | 95% | ✅ **RECOMMENDED** |
| 2 | **5paisa API** | REST API | ✅ Working | ~1s | 90% | ✅ Yes (backup) |
| 3 | **GRT Jewels (Puppeteer)** | Web Scraper | ⚠️ Partial | ~10s | 70% | ⚠️ Fallback only |
| 4 | **GRT Jewels (Simple)** | Web Scraper | ❌ Blocked | 0.2s | 0% | ❌ No |

---

## 🎯 Best Choice: GoodReturns with Puppeteer

### Why GoodReturns is Best:
✅ **Bypasses Cloudflare** - Uses real Chrome browser  
✅ **Works in Cloud Functions** - With 2GB memory allocation  
✅ **Reliable data** - Direct from source website  
✅ **Complete prices** - All purities for gold, silver, platinum  
✅ **30 second speed** - Acceptable for manual/scheduled syncs  

### How to Use:
**From Admin Dashboard:**
1. Open https://metals-svacron-com.firebaseapp.com
2. Sign in with Firebase
3. Go to Configuration tab
4. Click "Sync from GoodReturns" button
5. Wait ~30 seconds for completion

**Via API:**
```bash
POST https://us-central1-metals-svacron-com.cloudfunctions.net/api/sync-prices-goodreturns
Authorization: Bearer <YOUR_FIREBASE_TOKEN>
```

**Test Locally:**
```bash
cd metals-svacron-com-api
node test-goodreturns-puppeteer.js
```

### Technical Details:
- **File:** `functions/lib/goodReturnsScraperPuppeteer.js`
- **Endpoint:** `/sync-prices-goodreturns`
- **Method:** Puppeteer headless Chrome
- **URLs:**
  - Gold: https://www.goodreturns.in/gold-rates/
  - Silver: https://www.goodreturns.in/silver-rates/
  - Platinum: https://www.goodreturns.in/platinum-price.html
- **Fetches:** All 3 metals in parallel
- **Returns:** 
  - Gold: 999, 916, 750, 585
  - Silver: 999, 925
  - Platinum: 999, 950, 900

### Recent Test Results:
```json
{
  "gold": {
    "999": 13522,
    "916": 12398.55,
    "750": 10151.65,
    "585": 7918.29
  },
  "silver": {
    "999": 240,
    "925": 222.22
  },
  "platinum": {
    "999": 5841,
    "950": 5554.5,
    "900": 5262.16
  },
  "duration": "29.90s"
}
```

---

## 🔄 Backup: 5paisa API

### When to Use:
- When GoodReturns is down
- For automated scheduled syncs
- When you need faster response (<1s)

### Limitations:
⚠️ **Can be slow to update** - User reported delays  
⚠️ **API dependency** - Requires API Ninjas key  
⚠️ **Rate limits** - Limited free tier  

### How to Use:
**From Admin Dashboard:**
- Click "Sync from 5paisa" button

**Via API:**
```bash
POST /sync-prices-5paisa
Authorization: Bearer <TOKEN>
```

### Configuration Required:
1. Get API key from https://api-ninjas.com
2. Save in Firebase: `config/apiNinjasKey`
3. Set exchange rate: `config/usdToInrRate` (e.g., 83.5)

---

## ⚠️ Fallback: GRT Jewels

### Status:
- **Simple HTTP scraper:** ❌ Blocked in Cloud Functions (returns 8KB HTML vs 477KB locally)
- **Puppeteer scraper:** ⚠️ May work but less reliable than GoodReturns

### When to Use:
- Only as last resort
- Manual testing locally
- Not recommended for production

---

## 🚀 Recommended Setup

### For Production Use:

**Primary Method:** GoodReturns (Puppeteer)
- Update Admin UI to default to GoodReturns button
- Manual sync when needed
- Takes 30 seconds but very reliable

**Backup Method:** 5paisa API
- Keep scheduled functions running
- Automatically tries to sync at:
  - 9:00 AM IST
  - 9:30 AM IST  
  - 10:00 AM IST
  - 11:55 AM IST

**Fallback:** GRT Jewels
- Available for emergencies
- Not recommended for regular use

### Update Scheduled Functions to Use GoodReturns:

Currently scheduled functions use 5paisa. To switch to GoodReturns, edit `functions/src/index.ts`:

```typescript
export const scheduledPriceSync = functions
  .runWith({
    timeoutSeconds: 540,
    memory: '2GB' // Increased for Puppeteer
  })
  .pubsub
  .schedule('0,30 9 * * *')
  .timeZone('Asia/Kolkata')
  .onRun(async (context) => {
    console.log('Running scheduled price sync with GoodReturns...');
    
    const { scrapeAllMetals } = require('../lib/goodReturnsScraperPuppeteer');
    const prices = await scrapeAllMetals();
    
    // Update database with scraped prices
    for (const metal of ['gold', 'silver', 'platinum']) {
      const metalPrices = prices[metal];
      if (!metalPrices) continue;
      
      const rates = Object.entries(metalPrices).map(([purity, price]) => ({
        purity,
        price: price as number
      })).filter(r => r.price !== null);
      
      if (rates.length > 0) {
        await metalService.updateMetalPrices(metal, rates);
      }
    }
    
    return null;
  });
```

---

## 🧪 Testing All Sources

```bash
# Test GoodReturns (Puppeteer) - RECOMMENDED
node test-goodreturns-puppeteer.js

# Test 5paisa API
# (requires API key in Firebase config)

# Test GRT Jewels (Simple) - Will fail
node test-grt-simple.js

# Test GRT Jewels (Puppeteer)
node test-grt-puppeteer.js
```

---

## 💡 Why Websites Block Scrapers

1. **Bot Protection:** Cloudflare, Akamai, etc. detect automated tools
2. **IP Blocking:** Cloud Functions IPs get flagged
3. **JavaScript Challenges:** Require real browser to solve
4. **Rate Limiting:** Too many requests = temporary ban

**Solution:** Use Puppeteer with headless Chrome to simulate real browser.

---

## 💰 Cost Analysis

### GoodReturns (Puppeteer):
- **Cost:** Cloud Functions compute time (~30s × 2GB memory)
- **Estimate:** ~$0.0002 per sync
- **4 syncs/day:** ~$0.024/month
- **✅ FREE within Firebase free tier**

### 5paisa API:
- **Cost:** API Ninjas subscription
- **Free tier:** 10,000 calls/month
- **Paid:** $10/month for 100,000 calls
- **4 syncs/day × 30 days = 120 calls/month**
- **✅ FREE within API Ninjas free tier**

### GRT Jewels:
- **Cost:** Same as GoodReturns
- **Reliability:** Lower
- **Not recommended**

---

## 📝 Summary

| Need | Best Solution |
|------|---------------|
| **Most reliable prices** | GoodReturns (Puppeteer) |
| **Fastest response** | 5paisa API |
| **Lowest cost** | All are free in free tiers |
| **Production recommended** | GoodReturns primary, 5paisa backup |
| **Scheduled automation** | GoodReturns (update scheduler) |

---

## 🔧 Troubleshooting

### GoodReturns returns no prices:
1. Check if website is up: https://www.goodreturns.in
2. Check Cloud Functions logs for errors
3. Verify memory allocation is 2GB in functions config
4. Test locally first: `node test-goodreturns-puppeteer.js`

### 5paisa returns errors:
1. Check API key in Firebase: `config/apiNinjasKey`
2. Verify API Ninjas subscription status
3. Check rate limits on API Ninjas dashboard

### Scheduled functions not running:
1. Check Firebase Console > Functions > Logs
2. Verify schedule config: `config/schedule/enabled` = true
3. Check Cloud Scheduler in Google Cloud Console

---

## 📞 Support

For issues or questions:
1. Check Firebase Functions logs
2. Test scrapers locally first
3. Verify all configuration values
4. Check website availability

Last Updated: December 31, 2024
