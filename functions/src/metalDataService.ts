import { db, admin, calculateChange, generateChartData, formatDate, getYesterdayDate, getISTDate, getISTTimestamp } from './utils';
import { MetalData, MetalRate, HistoryEntry, AllMetalsResponse } from './types';

export class MetalDataService {
  // Note: In Cloud Functions, we can't write to the file system
  // JSON generation is handled separately for static hosting

  // Update metal prices from bot
  async updateMetalPrices(
    metal: 'gold' | 'silver' | 'platinum',
    rates: { purity: string; price: number }[],
    date?: string
  ): Promise<MetalData> {
    console.log(`\n=== UPDATE METAL PRICES: ${metal.toUpperCase()} ===`);
    console.log('Input rates:', JSON.stringify(rates, null, 2));
    console.log('Date provided:', date || 'not provided (using today)');
    
    const metalRef = db.ref(`metals/${metal}`);
    console.log(`Database reference: metals/${metal}`);

    const now = getISTDate();
    // Use provided date or today's date in IST
    const targetDate = date ? new Date(date + 'T00:00:00') : now;
    const today = formatDate(targetDate);
    const yesterday = getYesterdayDate();
    console.log(`Date info - Target: ${today}, Yesterday: ${yesterday}`);

    // Get yesterday's prices for comparison
    console.log('Fetching history data...');
    const historyRef = db.ref(`metals/${metal}/history`);
    const historySnapshot = await historyRef.once('value');
    const history: HistoryEntry[] = historySnapshot.val() || [];
    console.log(`✓ History entries found: ${history.length}`);
    
    // Sort history to find actual previous entry (not just yesterday by date)
    const sortedHistory = [...history].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    // Find the entry that comes right before today's date
    const todayTime = new Date(today).getTime();
    const previousEntry = sortedHistory
      .filter(h => new Date(h.date).getTime() < todayTime)
      .pop(); // Get the last entry before today
    
    console.log('Previous entry in history:', previousEntry || 'Not found (this will be first entry)');
    
    // Calculate changes for each purity
    console.log('Calculating price changes...');
    const updatedRates: MetalRate[] = rates.map((rate, index) => {
      // If no previous entry exists, this is the first entry - set change to 0
      let yesterdayRate: number;
      
      if (previousEntry?.price) {
        // Calculate the ratio of current purity price to base purity price
        const basePriceToday = rates[0].price; // First purity is always the base (999)
        const purityRatio = rate.price / basePriceToday;
        
        // Apply same ratio to previous entry's base price
        yesterdayRate = previousEntry.price * purityRatio;
        console.log(`Purity ${rate.purity}: Today ${rate.price}, Previous ${previousEntry.date} base ${previousEntry.price}, Ratio ${purityRatio.toFixed(4)}, Previous calculated ${yesterdayRate.toFixed(2)}`);
      } else {
        // No previous data - this is the first entry, use today's price (results in 0 change)
        yesterdayRate = rate.price;
        console.log(`Purity ${rate.purity}: First entry, setting change to 0`);
      }
      
      const { change, changePercent } = calculateChange(rate.price, yesterdayRate);
      
      return {
        purity: rate.purity,
        price: rate.price,
        change,
        changePercent
      };
    });
    console.log('✓ Updated rates calculated:', JSON.stringify(updatedRates, null, 2));

    // Update history - keep last 30 days
    const newHistoryEntry: HistoryEntry = {
      date: today,
      price: updatedRates[0].price, // Use first purity (highest) as reference
      change: updatedRates[0].change
    };
    console.log('New history entry:', newHistoryEntry);

    // Remove the old entry for this date if it exists
    let historyWithoutToday = history.filter(h => h.date !== today);
    
    // Add the new entry and sort chronologically (oldest to newest)
    let updatedHistory = [...historyWithoutToday, newHistoryEntry]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Find the index of today's entry
    const todayIndex = updatedHistory.findIndex(h => h.date === today);
    
    // If there's a next day entry, recalculate its change based on today's new price
    if (todayIndex >= 0 && todayIndex < updatedHistory.length - 1) {
      const nextDayEntry = updatedHistory[todayIndex + 1];
      const { change } = calculateChange(nextDayEntry.price, newHistoryEntry.price);
      nextDayEntry.change = change;
      console.log(`Recalculated next day (${nextDayEntry.date}) change: ${change}`);
    }
    
    // Keep last 30 days
    updatedHistory = updatedHistory.slice(-30);
    console.log(`✓ Updated history length: ${updatedHistory.length}`);

    // Determine which rates to use for top tiles (always use LATEST date)
    const latestDate = updatedHistory[updatedHistory.length - 1].date;
    let finalRates: MetalRate[];
    
    if (today === latestDate) {
      // If updating today/latest date, use the calculated rates
      finalRates = updatedRates;
      console.log(`Using updated rates for latest date (${latestDate})`);
    } else {
      // If updating a backdated entry, fetch current rates and keep them
      const currentSnapshot = await metalRef.once('value');
      const currentData = currentSnapshot.val();
      if (currentData && currentData.rates) {
        finalRates = currentData.rates;
        console.log(`Backdated update (${today}). Keeping existing latest rates for ${latestDate}`);
      } else {
        // Fallback: use the latest history entry's price to calculate rates
        const latestEntry = updatedHistory[updatedHistory.length - 1];
        const previousLatest = updatedHistory.length > 1 ? updatedHistory[updatedHistory.length - 2] : null;
        
        finalRates = rates.map(rate => {
          const priceRatio = latestEntry.price / newHistoryEntry.price;
          const adjustedPrice = parseFloat((rate.price * priceRatio).toFixed(2));
          
          // Calculate change for this rate
          let rateChange = 0;
          let rateChangePercent = 0;
          if (previousLatest) {
            const prevPrice = parseFloat((rate.price * (previousLatest.price / newHistoryEntry.price)).toFixed(2));
            const changeResult = calculateChange(adjustedPrice, prevPrice);
            rateChange = changeResult.change;
            rateChangePercent = changeResult.changePercent;
          }
          
          return {
            purity: rate.purity,
            price: adjustedPrice,
            change: rateChange,
            changePercent: rateChangePercent
          };
        });
        console.log(`No existing rates. Calculated from latest history entry`);
      }
    }

    // Prepare updated data
    const metalData: MetalData = {
      name: metal.charAt(0).toUpperCase() + metal.slice(1),
      symbol: metal === 'gold' ? 'Au' : metal === 'silver' ? 'Ag' : 'Pt',
      lastUpdated: getISTTimestamp(),
      rates: finalRates,
      history: updatedHistory.reverse(), // Newest to oldest for display
      chartData: generateChartData(updatedHistory)
    };
    console.log('Metal data prepared with latest rates');

    // Save to Firebase Realtime Database
    console.log('Saving to Firebase Database...');
    await metalRef.set(metalData);
    console.log('✓ Saved to database successfully');

    // Also save JSON file to Firebase Storage
    console.log('Saving to Firebase Storage...');
    await this.saveJsonToStorage(metal, metalData);

    console.log(`=== ${metal.toUpperCase()} UPDATE COMPLETE ===\n`);
    return metalData;
  }

  // Save JSON file to Firebase Storage
  private async saveJsonToStorage(metal: string, data: MetalData): Promise<void> {
    try {
      console.log(`\n--- Saving ${metal}.json to Firebase Storage ---`);
      const bucket = admin.storage().bucket();
      console.log(`Bucket name: ${bucket.name}`);
      
      const fileName = `live-data/${metal}.json`;
      console.log(`File path: ${fileName}`);
      
      const file = bucket.file(fileName);
      const jsonContent = JSON.stringify(data, null, 2);
      console.log(`JSON content size: ${jsonContent.length} bytes`);

      await file.save(jsonContent, {
        contentType: 'application/json',
        metadata: {
          cacheControl: 'public, max-age=300', // 5 minutes cache
        },
      });

      console.log(`✓ Saved ${metal}.json to Firebase Storage successfully`);
      console.log(`File URL: https://storage.googleapis.com/${bucket.name}/${fileName}`);
    } catch (error) {
      console.error(`✗ Error saving ${metal}.json to Storage:`, error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      // Don't throw - storage is secondary, DB is primary
    }
  }

  // Save all metals to a single JSON file
  private async saveAllMetalsJson(data: AllMetalsResponse): Promise<void> {
    try {
      const bucket = admin.storage().bucket();
      const file = bucket.file('live-data/all-metals.json');

      await file.save(JSON.stringify(data, null, 2), {
        contentType: 'application/json',
        metadata: {
          cacheControl: 'public, max-age=300',
        },
      });

      console.log('✓ Saved all-metals.json to Firebase Storage');
    } catch (error) {
      console.error('Error saving all-metals.json to Storage:', error);
    }
  }

  // Get metal data from Firebase
  async getMetalData(metal: 'gold' | 'silver' | 'platinum'): Promise<MetalData | null> {
    const snapshot = await db.ref(`metals/${metal}`).once('value');
    const data = snapshot.val();
    
    if (!data) {
      return null;
    }

    // Check if today's data exists
    const today = formatDate(getISTDate());
    const history: HistoryEntry[] = data.history || [];
    const todayEntry = history.find((h: HistoryEntry) => h.date === today);
    
    // If today's data doesn't exist, use yesterday's data
    if (!todayEntry && history.length > 0) {
      console.log(`No data for ${today} found for ${metal}, using most recent data`);
      // The most recent data is already in the rates and lastUpdated fields
      // We just return it as-is, showing the last available data
    }
    
    return data;
  }

  // Get all metals data
  async getAllMetalsData(): Promise<AllMetalsResponse> {
    const [gold, silver, platinum] = await Promise.all([
      this.getMetalData('gold'),
      this.getMetalData('silver'),
      this.getMetalData('platinum')
    ]);

    const lastUpdated = getISTTimestamp();

    const allMetalsData = {
      gold: gold!,
      silver: silver!,
      platinum: platinum!,
      lastUpdated
    };

    // Also save to storage
    await this.saveAllMetalsJson(allMetalsData);

    return allMetalsData;
  }

  // Initialize with mock data if empty
  async initializeWithMockData(): Promise<void> {
    const metals: Array<'gold' | 'silver' | 'platinum'> = ['gold', 'silver', 'platinum'];
    
    for (const metal of metals) {
      const exists = await this.getMetalData(metal);
      if (!exists) {
        const mockRates = this.getMockRates(metal);
        await this.updateMetalPrices(metal, mockRates);
      }
    }
  }

  // Recalculate change values for all metals based on history
  async recalculateAllChanges(): Promise<{ gold: boolean; silver: boolean; platinum: boolean }> {
    console.log('\n=== RECALCULATING CHANGES FOR ALL METALS ===');
    
    const results = {
      gold: false,
      silver: false,
      platinum: false
    };

    const metals: Array<'gold' | 'silver' | 'platinum'> = ['gold', 'silver', 'platinum'];
    
    for (const metal of metals) {
      try {
        console.log(`\n--- Processing ${metal.toUpperCase()} ---`);
        const metalRef = db.ref(`metals/${metal}`);
        const snapshot = await metalRef.once('value');
        const data = snapshot.val();
        
        if (!data || !data.history || data.history.length === 0) {
          console.log(`⚠ No history data for ${metal}`);
          continue;
        }

        // Sort history by date (oldest to newest)
        const history = [...data.history].sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        console.log(`Found ${history.length} history entries`);

        // Recalculate change for each history entry
        const updatedHistory = history.map((entry, index) => {
          if (index === 0) {
            // First entry has no previous day, set change to 0
            return { ...entry, change: 0 };
          }
          
          const previousEntry = history[index - 1];
          const { change } = calculateChange(entry.price, previousEntry.price);
          
          console.log(`${entry.date}: ₹${entry.price} (change: ${change} from ₹${previousEntry.price})`);
          
          return { ...entry, change };
        });

        // Get the most recent entry for updating rates
        const latestEntry = updatedHistory[updatedHistory.length - 1];
        const previousEntry = updatedHistory.length > 1 ? updatedHistory[updatedHistory.length - 2] : null;

        console.log(`Latest entry: ${latestEntry.date} = ₹${latestEntry.price}`);
        console.log(`Previous entry: ${previousEntry ? previousEntry.date + ' = ₹' + previousEntry.price : 'None'}`);

        // Update the rates array with latest prices and change values
        let updatedRates = data.rates;
        if (previousEntry) {
          const { change, changePercent } = calculateChange(latestEntry.price, previousEntry.price);
          
          // Calculate ratio between latest history price and current rates[0] price
          // This preserves the purity relationships while updating to latest prices
          const priceRatio = latestEntry.price / data.rates[0].price;
          
          updatedRates = data.rates.map((rate: any) => {
            // Update price to latest day's equivalent for this purity
            const updatedPrice = parseFloat((rate.price * priceRatio).toFixed(2));
            
            // Calculate proportional change for each purity based on base change
            const purityMultiplier = updatedPrice / latestEntry.price;
            const purityChange = parseFloat((change * purityMultiplier).toFixed(2));
            const purityChangePercent = changePercent; // Percentage is same for all purities

            return {
              ...rate,
              price: updatedPrice,
              change: purityChange,
              changePercent: purityChangePercent
            };
          });
        }

        console.log(`Updated ${updatedHistory.length} history entries and ${updatedRates.length} rate entries`);

        // Update both history and rates in the database
        await metalRef.update({
          history: updatedHistory,
          rates: updatedRates
        });

        console.log(`✓ ${metal} changes recalculated successfully`);
        results[metal] = true;

      } catch (error) {
        console.error(`✗ Error recalculating ${metal}:`, error);
      }
    }

    console.log('\n=== RECALCULATION COMPLETE ===');
    console.log('Results:', results);
    
    return results;
  }

  private getMockRates(metal: 'gold' | 'silver' | 'platinum'): { purity: string; price: number }[] {
    if (metal === 'gold') {
      return [
        { purity: '999', price: 6850 },
        { purity: '916', price: 6280 },
        { purity: '750', price: 5140 }
      ];
    } else if (metal === 'silver') {
      return [
        { purity: '999', price: 82 },
        { purity: '925', price: 76 }
      ];
    } else {
      return [
        { purity: '999', price: 3200 },
        { purity: '950', price: 3040 }
      ];
    }
  }
}
