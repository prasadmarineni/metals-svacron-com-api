# Metal Price Scraper Implementations

## Overview
Three scraper implementations for fetching metal prices from different sources:

## 1. ✅ 5paisa API (RECOMMENDED - PRODUCTION)
**Status:** ✅ Working reliably in Cloud Functions  
**File:** `functions/src/priceSync.ts`  
**Endpoint:** `/sync-prices-5paisa`

### Features:
- API-based (no web scraping)
- Works reliably in Cloud Functions
- Used by all scheduled functions
- Returns gold, silver, platinum prices

### Usage:
```bash
# Automatically runs at scheduled times:
# - 9:00 AM IST
# - 9:30 AM IST
# - 10:00 AM IST
# - 11:55 AM IST
```

### Configuration:
- Requires API Ninjas key in Firebase Database: `config/apiNinjasKey`
- USD to INR exchange rate: `config/usdToInrRate`

---

## 2. ⚠️ GRT Jewels Scraper (MANUAL TESTING ONLY)
**Status:** ⚠️ Works locally, blocked in Cloud Functions  
**File:** `functions/lib/grtJewelsScraperSimple.js`  
**Endpoint:** `/sync-prices-grt`

### Features:
- Fast HTML parsing (1-2 seconds locally)
- Parses embedded JSON data
- Separate purities for each metal

### Limitations:
- Gets different HTML in Cloud Functions (8KB vs 477KB)
- Likely bot detection or IP blocking
- **DO NOT use for scheduled syncs**
- Use only for manual testing via admin dashboard

### Technical Details:
```javascript
// Extracts from embedded JSON in HTML:
// "gold_rate":[{"type":"GOLD","purity":"24 KT","amount":13532}...]

const jsonPattern = /\\"gold_rate\\":\s*(\[[^\]]+\])/;
```

---

## 3. ❌ GoodReturns Scraper (REFERENCE ONLY)
**Status:** ❌ Blocked by Cloudflare in Cloud Functions  
**File:** `functions/lib/goodReturnsScraper.js`  
**Endpoint:** `/sync-prices-goodreturns`

### Features (If It Worked):
- Separate methods for each metal
- Parallel fetching for speed
- Clean HTML parsing

### URLs:
- Gold: https://www.goodreturns.in/gold-rates/
- Silver: https://www.goodreturns.in/silver-rates/
- Platinum: https://www.goodreturns.in/platinum-price.html

### HTML Patterns:
```html
<!-- Gold 24K -->
<span id="24K-price">₹13,522</span>

<!-- Silver 999 -->
<span id="silver-1g-price">₹240</span>

<!-- Platinum 999 -->
<span id="platinum-1g-price">₹5,841</span>
```

### Limitations:
- **Cloudflare bot protection** blocks all requests
- Requires full browser with JavaScript execution
- Returns 1.8KB Cloudflare challenge page instead of actual content
- **DO NOT use in production**

### Error Example:
```
✅ HTML fetched: 1826 bytes
❌ Could not find 24K gold price
```

---

## Recommendation for Production

### ✅ Current Setup (Optimal):
```
Scheduled Syncs → 5paisa API (reliable, proven)
Manual Testing → GRT/GoodReturns (when needed)
```

### Why This Works:
1. **5paisa API**: No bot protection, API-based, reliable
2. **GRT Jewels**: Available for manual testing only
3. **GoodReturns**: Reference implementation, doesn't work in Cloud

### Memory Configuration:
```typescript
// API endpoint (manual sync)
memory: '2GB'  // For GRT scraper if needed

// Scheduled functions
memory: '512MB'  // 5paisa API doesn't need heavy memory
```

---

## Testing Locally

### Test 5paisa:
```bash
# Not available as standalone test
# Integrated in priceSync.ts
```

### Test GRT Jewels:
```bash
cd /path/to/metals-svacron-com-api
node test-simple-scraper.js

# Expected: ~0.2 seconds, all prices found
```

### Test GoodReturns:
```bash
cd /path/to/metals-svacron-com-api
node test-goodreturns.js

# Expected: ~0.1 seconds, ❌ Cloudflare blocked
```

---

## Why Websites Block Scrapers

### Common Protections:
1. **Cloudflare Challenge** (GoodReturns)
   - JavaScript challenge before showing content
   - Detects headless browsers
   - Blocks Cloud Functions IPs

2. **Bot Detection** (GRT Jewels)
   - Different HTML for automated requests
   - IP-based blocking
   - User-agent filtering

3. **JavaScript Rendering**
   - Prices loaded after page load
   - Requires full browser environment
   - Cloud Functions = no browser

### Solutions That Don't Work:
- ❌ User-Agent headers (we tried)
- ❌ Simple HTTP requests (we tried)
- ❌ HTML-only parsing (we tried)

### Solutions That Work:
- ✅ API-based access (5paisa)
- ✅ Official APIs when available
- ⚠️ Full browser automation (too expensive for Cloud Functions)

---

## Cost Analysis

### Current Setup:
```
Scheduled Functions (512MB):
- 4 functions × 4 times/day × 30 days = 480 invocations/month
- Average duration: 5-10 seconds
- Memory: 512MB
- Cost: ~$0 (within free tier)

Manual Sync (2GB):
- Occasional use only
- Cost: ~$0 (minimal usage)
```

### If Using Full Browser:
```
Puppeteer Functions (2GB):
- Much slower (20-30 seconds)
- Higher memory usage
- Would exceed free tier quickly
- Not recommended
```

---

## Future Improvements

### Option 1: Add More APIs
- Find other API providers
- Implement as alternative sources
- Keep 5paisa as primary

### Option 2: Scheduled Local Scraping
- Run scrapers on local machine
- Push to Firebase via `/update-prices` endpoint
- Avoid Cloud Functions limitations

### Option 3: Browser Automation Service
- Use external service (ScraperAPI, etc.)
- Expensive but reliable
- Overkill for current needs

### ✅ Recommended: Keep Current Setup
- 5paisa API works perfectly
- Reliable and free
- No bot protection issues
- Best solution for production

---

## Conclusion

**Production Setup:**
- ✅ **Use 5paisa API** for all scheduled syncs
- ⚠️ GRT Jewels available for manual testing
- ❌ GoodReturns doesn't work (Cloudflare)

**Why This is Optimal:**
1. Reliable automated syncs (5paisa)
2. Alternative sources available if needed
3. Cost-effective (within free tier)
4. No bot detection issues
5. Fast execution times

**Don't Change Unless:**
- 5paisa API stops working
- Need Indian market-specific pricing
- Have budget for browser automation service
