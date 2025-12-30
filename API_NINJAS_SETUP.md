# API Ninjas Integration Setup

## Overview
The metals-svacron-com Firebase backend now integrates with API Ninjas to automatically fetch live metal prices (Gold, Silver, Platinum) and update the database.

## Features
1. **Automatic Price Sync** - Scheduled fetching from API Ninjas API
2. **Manual Sync Trigger** - Admin can manually trigger price updates
3. **Configurable Schedule** - Easy schedule configuration via admin panel
4. **Exchange Rate Management** - Configurable USD to INR conversion
5. **API Call Logging** - Track all API calls with success/failure status

## Setup Instructions

### 1. Get API Ninjas API Key
1. Visit [api-ninjas.com](https://api-ninjas.com)
2. Sign up for a free account
3. Navigate to API Keys section
4. Copy your API key

### 2. Configure via Admin Dashboard
1. Open the admin dashboard: `https://metals-svacron-com.web.app`
2. Go to **⚙️ Configuration** tab
3. Enter your API Ninjas key
4. Set the USD to INR exchange rate (default: 83.50)
5. Click **Save API Configuration**

### 3. Configure Auto-Sync Schedule
1. In the **Configuration** tab
2. Enable **Automatic Sync**
3. Set sync frequency using cron expression:
   - Default: `0 9,18 * * *` (9 AM and 6 PM daily)
   - Examples:
     - `0 9 * * *` - Daily at 9 AM
     - `0 9,15,21 * * *` - Three times daily (9 AM, 3 PM, 9 PM)
     - `0 */6 * * *` - Every 6 hours
4. Select timezone (default: Asia/Kolkata)
5. Click **Save Schedule Configuration**

### 4. Deploy Updated Functions
```bash
cd functions
npm run build
firebase deploy --only functions
```

## API Endpoints

### Configuration Endpoints

#### Get Schedule Configuration
```
GET /api/config/schedule
```

#### Update Schedule Configuration
```
POST /api/config/schedule
Content-Type: application/json

{
  "apiKey": "your-admin-api-key",
  "enabled": true,
  "frequency": "0 9,18 * * *",
  "timezone": "Asia/Kolkata"
}
```

#### Get API Configuration Status
```
GET /api/config/api
```
Returns whether API Ninjas is configured and current exchange rate.

#### Update API Configuration
```
POST /api/config/api
Content-Type: application/json

{
  "apiKey": "your-admin-api-key",
  "apiNinjasKey": "your-api-ninjas-key",
  "usdToInrRate": 83.5
}
```

#### Manual Price Sync
```
POST /api/sync-prices
Content-Type: application/json

{
  "apiKey": "your-admin-api-key"
}
```

#### Get API Call Logs
```
GET /api/logs/api-calls
```
Returns last 50 API call logs.

## How It Works

### Price Fetching Flow
1. **Scheduled Function** runs at configured times (default: 9 AM & 6 PM IST)
2. Checks if auto-sync is enabled in Firebase config
3. Fetches live prices from API Ninjas (USD per troy ounce)
4. Converts to per gram (÷ 31.1035)
5. Converts USD to INR using configured exchange rate
6. Calculates prices for different purities:
   - Gold: 24K, 22K (91.6%), 18K (75%)
   - Silver: 999, Sterling 925 (92.5%)
   - Platinum: 999, 950 (95%)
7. Updates Firebase Realtime Database
8. Logs the API call result

### Data Structure in Firebase
```
/config
  /apiNinjasKey: "your-key"
  /usdToInrRate: 83.5
  /schedule
    /enabled: true
    /frequency: "0 9,18 * * *"
    /timezone: "Asia/Kolkata"
    /lastRun: "2025-12-30T09:00:00.000Z"

/metals
  /gold
    /name: "Gold"
    /symbol: "Au"
    /lastUpdated: "..."
    /rates: [...]
    /history: [...]
    /chartData: {...}

/logs
  /apiCalls
    /-abc123
      /timestamp: "..."
      /success: true
      /error: null
```

## Cron Expression Guide

Format: `minute hour day month dayOfWeek`

Examples:
- `0 9 * * *` - Every day at 9:00 AM
- `0 9,18 * * *` - Every day at 9:00 AM and 6:00 PM
- `0 */6 * * *` - Every 6 hours
- `0 9 * * 1-5` - Every weekday at 9:00 AM
- `30 8,14,20 * * *` - Three times daily at 8:30 AM, 2:30 PM, 8:30 PM

## Monitoring

### Check Sync Status
1. Open admin dashboard
2. Go to **Configuration** tab
3. Check "Last Sync Status" section
4. View "Recent API Call Logs" table

### Manual Testing
1. Click **🔄 Sync Now** button in Configuration tab
2. Enter admin API key
3. Check if prices updated in Gold/Silver/Platinum tabs

## Troubleshooting

### Prices Not Updating
1. Check if API Ninjas key is configured correctly
2. Verify schedule is enabled in Configuration
3. Check Firebase Functions logs: `firebase functions:log`
4. Review API call logs in admin dashboard

### Invalid Prices
1. Verify USD to INR exchange rate is current
2. Check API Ninjas quota limits
3. Review error logs in admin dashboard

### Schedule Not Working
**Important**: Cron schedule changes in code require redeployment:
```bash
firebase deploy --only functions
```

The schedule configuration in Firebase only controls the enabled/disabled state, not the actual cron timing (which is defined in the deployed function).

## Cost Considerations

### API Ninjas
- Free tier: 10,000 requests/month
- With 2x daily sync: ~60 requests/month (well within free tier)

### Firebase
- Cloud Functions: Charged per invocation
- Realtime Database: Charged per GB stored and downloaded
- Scheduled functions count as invocations

## Security Notes
1. Never expose API Ninjas key in client-side code
2. Admin API key required for all configuration changes
3. API keys stored securely in Firebase Realtime Database
4. Use environment variables for sensitive data in production

## Future Enhancements
- [ ] Support multiple currencies
- [ ] Historical price archiving
- [ ] Price alert notifications
- [ ] Backup data source if API Ninjas fails
- [ ] Custom purity calculations
- [ ] Rate limiting for manual sync
