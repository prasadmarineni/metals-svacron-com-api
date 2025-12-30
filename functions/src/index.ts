import * as functions from 'firebase-functions';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { MetalDataService } from './metalDataService';
import { PriceSyncService } from './priceSync';
import { ExternalApiService } from './externalApi';
import { validateApiKey, validateAuthToken, getUserFromToken } from './utils';

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

const metalService = new MetalDataService();
const syncService = new PriceSyncService();
const externalApiService = new ExternalApiService();

// Auth middleware
async function requireAuth(req: Request, res: Response, next: any) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const token = authHeader.substring(7);
  const isValid = await validateAuthToken(token);
  
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  
  req.body.userEmail = await getUserFromToken(token);
  next();
}

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get all metals data (JSON response)
app.get('/metals', async (req: Request, res: Response) => {
  try {
    const data = await metalService.getAllMetalsData();
    res.json(data);
  } catch (error) {
    console.error('Error fetching metals data:', error);
    return res.status(500).json({ error: 'Failed to fetch metals data' });
  }
});

// Get specific metal data (JSON response)
app.get('/metals/:metal', async (req: Request, res: Response) => {
  try {
    const metal = req.params.metal as 'gold' | 'silver' | 'platinum';
    
    if (!['gold', 'silver', 'platinum'].includes(metal)) {
      return res.status(400).json({ error: 'Invalid metal type' });
    }

    const data = await metalService.getMetalData(metal);
    
    if (!data) {
      return res.status(404).json({ error: 'Metal data not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching metal data:', error);
    return res.status(500).json({ error: 'Failed to fetch metal data' });
  }
});

// Update metal prices (for bot)
app.post('/update-prices', requireAuth, async (req: Request, res: Response) => {
  console.log('=== UPDATE PRICES ENDPOINT CALLED ===');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  
  try {
    const { metal, rates, date } = req.body;

    // Validate input
    if (!metal || !rates || !Array.isArray(rates)) {
      console.error('✗ Invalid request body - missing metal or rates');
      return res.status(400).json({ error: 'Invalid request body' });
    }

    if (!['gold', 'silver', 'platinum'].includes(metal)) {
      console.error(`✗ Invalid metal type: ${metal}`);
      return res.status(400).json({ error: 'Invalid metal type' });
    }

    console.log(`Updating ${metal} with ${rates.length} rates...`);
    console.log('Date for update:', date || 'today (default)');
    
    // Update prices with optional date
    const updatedData = await metalService.updateMetalPrices(metal, rates, date);
    console.log(`✓ ${metal} prices updated successfully`);
    console.log('Updated data:', JSON.stringify(updatedData, null, 2));
    
    res.json({
      success: true,
      message: `${metal} prices updated successfully`,
      data: updatedData
    });
  } catch (error) {
    console.error('✗ Error updating prices:', error);
    return res.status(500).json({ error: 'Failed to update prices', details: String(error) });
  }
});

// Batch update all metals
app.post('/update-all', async (req: Request, res: Response) => {
  try {
    const { gold, silver, platinum, apiKey } = req.body;

    // Validate API key
    if (!validateApiKey(apiKey)) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    const updates: any = {};

    if (gold?.rates) {
      updates.gold = await metalService.updateMetalPrices('gold', gold.rates);
    }
    if (silver?.rates) {
      updates.silver = await metalService.updateMetalPrices('silver', silver.rates);
    }
    if (platinum?.rates) {
      updates.platinum = await metalService.updateMetalPrices('platinum', platinum.rates);
    }

    res.json({
      success: true,
      message: 'All metal prices updated successfully',
      data: updates
    });
  } catch (error) {
    console.error('Error updating all prices:', error);
    return res.status(500).json({ error: 'Failed to update prices' });
  }
});

// Initialize data (one-time setup)
app.post('/initialize', requireAuth, async (req: Request, res: Response) => {
  console.log('=== INITIALIZE ENDPOINT CALLED ===');
  console.log('User:', req.body.userEmail);
  
  try {
    console.log('Starting database initialization with mock data...');
    await metalService.initializeWithMockData();
    console.log('✓ Initialize completed successfully');

    res.json({
      success: true,
      message: 'Database initialized with mock data'
    });
  } catch (error) {
    console.error('✗ Initialize error:', error);
    return res.status(500).json({ error: 'Failed to initialize', details: String(error) });
  }
});

// Manual sync trigger - start async, return immediately
app.post('/sync-prices', requireAuth, async (req: Request, res: Response) => {
  try {
    // Start sync in background, don't wait for completion
    syncService.syncAllPrices()
      .then(() => console.log('✓ Background sync completed'))
      .catch((error) => console.error('✗ Background sync failed:', error));
    
    // Return immediately
    res.json({
      success: true,
      message: 'Price sync started in background. Check logs in a few moments.'
    });
  } catch (error) {
    console.error('Error starting sync:', error);
    return res.status(500).json({ error: 'Failed to start sync' });
  }
});

// Get schedule configuration
app.get('/config/schedule', async (req: Request, res: Response) => {
  try {
    const config = await externalApiService.getScheduleConfig();
    res.json(config);
  } catch (error) {
    console.error('Error fetching schedule config:', error);
    return res.status(500).json({ error: 'Failed to fetch schedule config' });
  }
});

// Update schedule configuration
app.post('/config/schedule', requireAuth, async (req: Request, res: Response) => {
  try {
    const { config } = req.body;

    await externalApiService.updateScheduleConfig(config);
    
    res.json({
      success: true,
      message: 'Schedule configuration updated'
    });
  } catch (error) {
    console.error('Error updating schedule config:', error);
    return res.status(500).json({ error: 'Failed to update schedule config' });
  }
});

// Get API configuration (without exposing full keys)
app.get('/config/api', async (req: Request, res: Response) => {
  try {
    const { db } = require('./utils');
    
    const apiKeySnapshot = await db.ref('config/apiNinjasKey').once('value');
    const apiKey = apiKeySnapshot.val();
    const exchangeRateSnapshot = await db.ref('config/usdToInrRate').once('value');
    const exchangeRate = exchangeRateSnapshot.val() || 83.5;
    
    // Mask API key for security (show last 4 chars)
    let maskedKey = '';
    if (apiKey && apiKey.length > 4) {
      maskedKey = '•••••' + apiKey.slice(-4);
    }
    
    res.json({
      apiNinjasConfigured: !!apiKey,
      apiNinjasKeyMasked: maskedKey,
      usdToInrRate: exchangeRate
    });
  } catch (error) {
    console.error('Error fetching API config:', error);
    return res.status(500).json({ error: 'Failed to fetch API config' });
  }
});

// Update API configuration
app.post('/config/api', requireAuth, async (req: Request, res: Response) => {
  try {
    const { apiNinjasKey, usdToInrRate } = req.body;

    const { db } = require('./utils');
    const updates: any = {};
    
    // Only update if value provided
    if (apiNinjasKey && apiNinjasKey.trim()) {
      updates['config/apiNinjasKey'] = apiNinjasKey.trim();
    }
    
    if (usdToInrRate !== undefined && usdToInrRate !== null) {
      updates['config/usdToInrRate'] = Number(usdToInrRate);
    }
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No configuration values provided' });
    }
    
    await db.ref().update(updates);
    
    res.json({
      success: true,
      message: 'API configuration updated'
    });
  } catch (error) {
    console.error('Error updating API config:', error);
    return res.status(500).json({ error: 'Failed to update API config' });
  }
});

// Get API call logs
app.get('/logs/api-calls', async (req: Request, res: Response) => {
  try {
    const { db } = require('./utils');
    const snapshot = await db.ref('logs/apiCalls').limitToLast(50).once('value');
    const logs = snapshot.val() || {};
    
    res.json(Object.values(logs).reverse());
  } catch (error) {
    console.error('Error fetching API logs:', error);
    return res.status(500).json({ error: 'Failed to fetch API logs' });
  }
});

// Recalculate change values for all metals
app.post('/recalculate-changes', requireAuth, async (req: Request, res: Response) => {
  console.log('=== RECALCULATE CHANGES ENDPOINT CALLED ===');
  
  try {
    const results = await metalService.recalculateAllChanges();
    
    res.json({
      success: true,
      message: 'Successfully recalculated change values for all metals',
      results
    });
  } catch (error) {
    console.error('✗ Error recalculating changes:', error);
    return res.status(500).json({ error: 'Failed to recalculate changes', details: String(error) });
  }
});

// Export the Express app as a Cloud Function (1st Gen) with increased timeout
export const api = functions
  .runWith({
    timeoutSeconds: 540, // 9 minutes
    memory: '512MB'
  })
  .https.onRequest(app);

// Scheduled function to sync prices automatically
// Runs based on the schedule configured in Firebase (default: 9 AM and 6 PM IST)
export const scheduledPriceSync = functions
  .runWith({
    timeoutSeconds: 540, // 9 minutes
    memory: '512MB'
  })
  .pubsub
  .schedule('0,30 9 * * *') // 9:00 AM and 9:30 AM IST daily
  .timeZone('Asia/Kolkata')
  .onRun(async (context) => {
    console.log('Running scheduled price sync (Morning 9 AM slot)...');
    
    try {
      // Check if scheduling is enabled
      const config = await externalApiService.getScheduleConfig();
      
      if (!config.enabled) {
        console.log('Scheduled sync is disabled');
        return null;
      }
      
      // Run the sync
      const result = await syncService.syncAllPrices();
      
      if (result.success) {
        console.log('Scheduled sync completed:', result.message);
      } else {
        console.error('Scheduled sync failed:', result.message);
      }
      
      return null;
    } catch (error) {
      console.error('Error in scheduled sync:', error);
      return null;
    }
  });

// Additional scheduled sync at 10:00 AM IST
export const scheduledPriceSync10AM = functions
  .runWith({
    timeoutSeconds: 540,
    memory: '512MB'
  })
  .pubsub
  .schedule('0 10 * * *') // 10:00 AM IST daily
  .timeZone('Asia/Kolkata')
  .onRun(async (context) => {
    console.log('Running scheduled price sync (10 AM slot)...');
    
    try {
      const config = await externalApiService.getScheduleConfig();
      
      if (!config.enabled) {
        console.log('Scheduled sync is disabled');
        return null;
      }
      
      const result = await syncService.syncAllPrices();
      
      if (result.success) {
        console.log('Scheduled sync completed:', result.message);
      } else {
        console.error('Scheduled sync failed:', result.message);
      }
      
      return null;
    } catch (error) {
      console.error('Error in scheduled sync:', error);
      return null;
    }
  });

// Additional scheduled sync at 11:55 AM IST
export const scheduledPriceSync1155AM = functions
  .runWith({
    timeoutSeconds: 540,
    memory: '512MB'
  })
  .pubsub
  .schedule('55 11 * * *') // 11:55 AM IST daily
  .timeZone('Asia/Kolkata')
  .onRun(async (context) => {
    console.log('Running scheduled price sync (11:55 AM slot)...');
    
    try {
      const config = await externalApiService.getScheduleConfig();
      
      if (!config.enabled) {
        console.log('Scheduled sync is disabled');
        return null;
      }
      
      const result = await syncService.syncAllPrices();
      
      if (result.success) {
        console.log('Scheduled sync completed:', result.message);
      } else {
        console.error('Scheduled sync failed:', result.message);
      }
      
      return null;
    } catch (error) {
      console.error('Error in scheduled sync:', error);
      return null;
    }
  });
