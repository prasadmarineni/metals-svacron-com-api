# Metals API Backend - Firebase Hosting

This Firebase project provides the backend API for **metals.svacron.com**. It manages precious metal prices (Gold, Silver, Platinum) and serves optimized JSON data to reduce Firebase Database reads.

## 🏗️ Architecture

```
metals-svacron-com (Firebase Project)
├── functions/          # Cloud Functions (Express API)
│   ├── src/
│   │   ├── index.ts              # Main API routes
│   │   ├── metalDataService.ts   # Business logic
│   │   ├── utils.ts              # Helper functions
│   │   └── types.ts              # TypeScript interfaces
│   ├── package.json
│   └── tsconfig.json
├── public/             # Firebase Hosting (Admin UI)
│   ├── index.html      # Admin dashboard
│   └── data/           # Generated JSON files (auto-created)
│       ├── gold.json
│       ├── silver.json
│       ├── platinum.json
│       └── all-metals.json
├── firebase.json
└── package.json
```

## 🚀 Features

### 1. **API Endpoints**
- `GET /api/metals` - Fetch all metals data
- `GET /api/metals/:metal` - Fetch specific metal (gold/silver/platinum)
- `POST /api/update-prices` - Update prices (requires API key)
- `POST /api/update-all` - Batch update all metals (requires API key)
- `POST /api/initialize` - Initialize database with mock data

### 2. **Admin Dashboard**
- Web-based UI at the root URL
- Update prices for Gold (24K, 22K, 18K)
- Update prices for Silver (999, Sterling 925)
- Update prices for Platinum (999, 950)
- View current prices with change indicators
- API documentation built-in

### 3. **Data Management**
- Automatically calculates price changes vs yesterday
- Maintains 30-day price history
- Generates chart data for 1Y, 3Y, 5Y, 10Y, ALL timeframes
- Saves data to both Firebase Database AND JSON files
- JSON files served via Firebase Hosting (fast, cached)

## 📦 Setup Instructions

### Prerequisites
- Node.js 20+
- Firebase CLI: `npm install -g firebase-tools`
- Firebase project created at [console.firebase.google.com](https://console.firebase.google.com)

### 1. Initialize Firebase Project

```bash
cd /path/to/metals-svacron-com

# Login to Firebase
firebase login

# Initialize Firebase (if not already done)
firebase init

# Select:
# - Functions (TypeScript)
# - Hosting
# - Realtime Database (optional)
```

### 2. Update Firebase Project ID

Edit `.firebaserc`:
```json
{
  "projects": {
    "default": "your-actual-firebase-project-id"
  }
}
```

### 3. Install Dependencies

```bash
# Install functions dependencies
cd functions
npm install

# Build TypeScript
npm run build
```

### 4. Configure Environment Variables

Create `functions/.env` (optional):
```env
API_KEY=your-secure-api-key-here
```

Default API key: `metals-api-key-2025`

### 5. Set up Firebase Realtime Database

1. Go to Firebase Console → Realtime Database
2. Create database (Start in test mode for development)
3. Database structure will be auto-created on first data push

Database structure:
```json
{
  "metals": {
    "gold": { /* MetalData object */ },
    "silver": { /* MetalData object */ },
    "platinum": { /* MetalData object */ }
  }
}
```

## 🛠️ Development

### Local Testing (Emulators)

```bash
# Start Firebase emulators
npm run serve

# OR from root:
firebase emulators:start --only functions,hosting
```

Access:
- Admin UI: http://localhost:5000
- API: http://localhost:5001/your-project-id/us-central1/api
- Emulator UI: http://localhost:4000

### Initialize with Mock Data

```bash
# Using the admin UI:
# 1. Open http://localhost:5000
# 2. Go to API Documentation tab
# 3. Note the initialize endpoint

# Or via curl:
curl -X POST http://localhost:5001/your-project-id/us-central1/api/initialize \
  -H "Content-Type: application/json" \
  -d '{"apiKey": "metals-api-key-2025"}'
```

## 🚀 Deployment

### Deploy Everything

```bash
firebase deploy
```

### Deploy Functions Only

```bash
npm run deploy:functions
# OR
firebase deploy --only functions
```

### Deploy Hosting Only

```bash
npm run deploy:hosting
# OR
firebase deploy --only hosting
```

Your app will be live at:
- **Admin UI**: `https://your-project-id.web.app`
- **API**: `https://your-project-id.web.app/api`

## 📡 API Usage

### For Bot Integration

**Update Gold Prices:**
```bash
curl -X POST https://your-project-id.web.app/api/update-prices \
  -H "Content-Type: application/json" \
  -d '{
    "metal": "gold",
    "rates": [
      { "purity": "24K", "price": 6850 },
      { "purity": "22K", "price": 6280 },
      { "purity": "18K", "price": 5140 }
    ],
    "apiKey": "metals-api-key-2025"
  }'
```

**Batch Update All Metals:**
```bash
curl -X POST https://your-project-id.web.app/api/update-all \
  -H "Content-Type: application/json" \
  -d '{
    "gold": {
      "rates": [
        { "purity": "24K", "price": 6850 },
        { "purity": "22K", "price": 6280 },
        { "purity": "18K", "price": 5140 }
      ]
    },
    "silver": {
      "rates": [
        { "purity": "999", "price": 82 },
        { "purity": "Sterling (925)", "price": 76 }
      ]
    },
    "platinum": {
      "rates": [
        { "purity": "999", "price": 3200 },
        { "purity": "950", "price": 3040 }
      ]
    },
    "apiKey": "metals-api-key-2025"
  }'
```

### For Next.js App

**Fetch All Metals:**
```javascript
const response = await fetch('https://your-project-id.web.app/api/metals');
const data = await response.json();
```

**Fetch Specific Metal:**
```javascript
const response = await fetch('https://your-project-id.web.app/api/metals/gold');
const goldData = await response.json();
```

## 🔗 Integration with metals.svacron.com

Update Next.js app environment variable:

**`.env.local` in metals.svacron.com:**
```env
NEXT_PUBLIC_API_URL=https://your-project-id.web.app/api
```

The Next.js app will automatically fetch from this API instead of directly querying Firebase.

## 📊 Data Flow

```
Bot (Live Price Scraper)
    ↓ POST /api/update-prices
Firebase Cloud Functions
    ↓ Update
Firebase Realtime Database
    ↓ Generate & Save
JSON Files (public/data/)
    ↓ Served via
Firebase Hosting (CDN)
    ↓ Fetch
Next.js App (metals.svacron.com)
    ↓ Display
User Browser
```

## 🔐 Security

### API Key Protection
- All update endpoints require API key
- Set custom key via environment variable: `API_KEY`
- Never commit API keys to repository

### Firebase Database Rules

```json
{
  "rules": {
    "metals": {
      ".read": true,
      ".write": false
    }
  }
}
```

Only Cloud Functions can write data. Public read access for JSON serving.

## 🧪 Testing

### Test API Endpoint
```bash
curl https://your-project-id.web.app/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-12-30T..."
}
```

### Test Data Fetch
```bash
curl https://your-project-id.web.app/api/metals/gold
```

## 📝 Monitoring

### View Logs
```bash
firebase functions:log
```

### Firebase Console
- Monitor API usage in Firebase Console → Functions
- Check database reads/writes in Realtime Database
- View hosting traffic in Firebase Hosting

## 🐛 Troubleshooting

### Functions not deploying
- Ensure Node.js version is 20+
- Run `npm run build` in functions directory
- Check `firebase.json` runtime configuration

### API returns 500 errors
- Check function logs: `firebase functions:log`
- Verify Firebase Realtime Database is created
- Ensure API key is correct

### JSON files not being created
- Check functions have write permissions
- Verify `public/data/` directory exists
- Check Firebase Hosting configuration

## 📚 Additional Resources

- [Firebase Functions Documentation](https://firebase.google.com/docs/functions)
- [Firebase Hosting Documentation](https://firebase.google.com/docs/hosting)
- [Firebase Realtime Database](https://firebase.google.com/docs/database)

## 🤝 Support

For issues or questions, contact: your-email@example.com

---

**Project**: metals-svacron-com  
**Version**: 1.0.0  
**Last Updated**: December 30, 2025
