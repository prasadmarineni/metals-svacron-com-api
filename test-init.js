// Quick test script to initialize database
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://metals-svacron-com-default-rtdb.firebaseio.com'
});

const db = admin.database();

async function initializeData() {
  console.log('Initializing database with mock data...');
  
  const metals = {
    gold: {
      name: 'Gold',
      symbol: 'Au',
      lastUpdated: new Date().toISOString(),
      rates: [
        { purity: '24K', price: 6850, change: 0, changePercent: 0 },
        { purity: '22K', price: 6280, change: 0, changePercent: 0 },
        { purity: '18K', price: 5140, change: 0, changePercent: 0 }
      ],
      history: [],
      chartData: { oneWeek: [], oneMonth: [], oneYear: [] }
    },
    silver: {
      name: 'Silver',
      symbol: 'Ag',
      lastUpdated: new Date().toISOString(),
      rates: [
        { purity: '999', price: 82, change: 0, changePercent: 0 },
        { purity: 'Sterling (925)', price: 76, change: 0, changePercent: 0 }
      ],
      history: [],
      chartData: { oneWeek: [], oneMonth: [], oneYear: [] }
    },
    platinum: {
      name: 'Platinum',
      symbol: 'Pt',
      lastUpdated: new Date().toISOString(),
      rates: [
        { purity: '999', price: 3200, change: 0, changePercent: 0 },
        { purity: '950', price: 3040, change: 0, changePercent: 0 }
      ],
      history: [],
      chartData: { oneWeek: [], oneMonth: [], oneYear: [] }
    }
  };

  try {
    await db.ref('metals').set(metals);
    console.log('✓ Database initialized successfully!');
    
    // Verify
    const snapshot = await db.ref('metals').once('value');
    console.log('✓ Verification: Data exists in database');
    console.log('Metals:', Object.keys(snapshot.val()));
  } catch (error) {
    console.error('✗ Error:', error);
  }
  
  process.exit(0);
}

initializeData();
