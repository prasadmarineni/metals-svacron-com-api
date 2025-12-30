// Price synchronization service - fetches from 5paisa.com
import { FivePaisaScraperService } from './fivePaisaScraper';
import { MetalDataService } from './metalDataService';

export class PriceSyncService {
  private fivePaisaScraper: FivePaisaScraperService;
  private metalService: MetalDataService;

  constructor() {
    this.fivePaisaScraper = new FivePaisaScraperService();
    this.metalService = new MetalDataService();
  }

  // Main sync function - uses 5paisa.com 4-method architecture
  async syncAllPrices(): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      console.log('=== Starting Price Sync from 5paisa.com ===');
      console.log('Using orchestrator method (Method 1)...');
      
      // Call Method 1 (orchestrator) which calls Methods 2, 3, 4 with individual error handling
      const result = await this.fivePaisaScraper.fetchAllPrices();
      
      console.log('✓ Orchestrator completed');
      console.log('Results:', JSON.stringify(result.results, null, 2));
      
      // Count successful updates
      let updateCount = 0;
      if (result.results.gold?.success) updateCount++;
      if (result.results.silver?.success) updateCount++;
      if (result.results.platinum?.success) updateCount++;
      
      if (updateCount === 0) {
        console.log('⚠ No metals updated successfully');
        return {
          success: false,
          message: 'Unable to fetch prices from 5paisa.com. Please try manual update.',
          data: result.results
        };
      }

      
      console.log(`\n=== Sync Complete: ${updateCount} metal(s) updated ===`);
      
      return {
        success: true,
        message: `Successfully updated ${updateCount} metal(s) from 5paisa.com`,
        data: result.results
      };
    } catch (error: any) {
      console.error('✗ Price sync failed with error:', error);
      console.error('Error stack:', error.stack);
      
      return {
        success: false,
        message: `Price sync failed: ${error.message}`
      };
    }
  }

  /**
   * Manual update methods - can be called from admin dashboard
   * These replicate the logic in FivePaisa methods 2, 3, 4
   */
  async manualUpdateGold(price: number, unit: '10g' | 'gram' = '10g') {
    console.log(`Manual Gold update: ₹${price}/${unit}`);
    const pricePerGram = unit === '10g' ? price / 10 : price;
    
    const rates = [
      { purity: '24K (999)', price: Number(pricePerGram.toFixed(2)) },
      { purity: '22K (916)', price: Number((pricePerGram * 0.9166666667).toFixed(2)) }, // 22/24 = 91.67%
      { purity: '18K (750)', price: Number((pricePerGram * 0.75).toFixed(2)) }, // 18/24 = 75.00%
      { purity: '14K', price: Number((pricePerGram * 0.5833333333).toFixed(2)) } // 14/24 = 58.33%
    ];

    return await this.metalService.updateMetalPrices('gold', rates);
  }

  async manualUpdateSilver(price: number, unit: 'kg' | 'gram' = 'kg') {
    console.log(`Manual Silver update: ₹${price}/${unit}`);
    const pricePerGram = unit === 'kg' ? price / 1000 : price;
    
    const rates = [
      { purity: 'Pure (999)', price: Number(pricePerGram.toFixed(2)) },
      { purity: '925 (Sterling)', price: Number((pricePerGram * 0.925).toFixed(2)) } // 92.5%
    ];

    return await this.metalService.updateMetalPrices('silver', rates);
  }

  async manualUpdatePlatinum(price: number, unit: '10g' | 'gram' = '10g') {
    console.log(`Manual Platinum update: ₹${price}/${unit}`);
    const pricePerGram = unit === '10g' ? price / 10 : price;
    
    const rates = [
      { purity: 'Pure (999)', price: Number(pricePerGram.toFixed(2)) },
      { purity: '950', price: Number((pricePerGram * 0.95).toFixed(2)) }, // 95.0%
      { purity: '900', price: Number((pricePerGram * 0.90).toFixed(2)) } // 90.0%
    ];

    return await this.metalService.updateMetalPrices('platinum', rates);
  }
}