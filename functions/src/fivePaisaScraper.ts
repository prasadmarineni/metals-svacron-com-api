import * as cheerio from 'cheerio';
import { MetalDataService } from './metalDataService';

export class FivePaisaScraperService {
  private metalDataService: MetalDataService;
  
  private readonly URLS = {
    gold: 'https://www.5paisa.com/commodity-trading/gold-rate-today',
    silver: 'https://www.5paisa.com/commodity-trading/silver-rate-today',
    platinum: 'https://www.5paisa.com/commodity-trading/platinum'
  };

  constructor() {
    this.metalDataService = new MetalDataService();
  }

  /**
   * METHOD 1: Orchestrator - Fetches all metal prices with individual error handling
   * Calls methods 2, 3, 4 with try/catch for each
   */
  async fetchAllPrices(): Promise<{
    success: boolean;
    results: {
      gold?: { success: boolean; price?: number; error?: string };
      silver?: { success: boolean; price?: number; error?: string };
      platinum?: { success: boolean; price?: number; error?: string };
    };
    message: string;
  }> {
    console.log('🚀 [FivePaisa] Starting fetchAllPrices orchestrator');
    
    const results: any = {};
    let successCount = 0;
    let failCount = 0;

    // Fetch Gold
    try {
      console.log('📊 [FivePaisa] Attempting to fetch and update Gold...');
      const goldResult = await this.fetchAndUpdateGold();
      results.gold = goldResult;
      if (goldResult.success) {
        successCount++;
        console.log(`✅ [FivePaisa] Gold updated successfully: ₹${goldResult.price}/gram`);
      } else {
        failCount++;
        console.log(`❌ [FivePaisa] Gold update failed: ${goldResult.error}`);
      }
    } catch (error: any) {
      failCount++;
      results.gold = { success: false, error: error.message };
      console.error('❌ [FivePaisa] Gold fetch crashed:', error);
    }

    // Fetch Silver
    try {
      console.log('📊 [FivePaisa] Attempting to fetch and update Silver...');
      const silverResult = await this.fetchAndUpdateSilver();
      results.silver = silverResult;
      if (silverResult.success) {
        successCount++;
        console.log(`✅ [FivePaisa] Silver updated successfully: ₹${silverResult.price}/gram`);
      } else {
        failCount++;
        console.log(`❌ [FivePaisa] Silver update failed: ${silverResult.error}`);
      }
    } catch (error: any) {
      failCount++;
      results.silver = { success: false, error: error.message };
      console.error('❌ [FivePaisa] Silver fetch crashed:', error);
    }

    // Fetch Platinum
    try {
      console.log('📊 [FivePaisa] Attempting to fetch and update Platinum...');
      const platinumResult = await this.fetchAndUpdatePlatinum();
      results.platinum = platinumResult;
      if (platinumResult.success) {
        successCount++;
        console.log(`✅ [FivePaisa] Platinum updated successfully: ₹${platinumResult.price}/gram`);
      } else {
        failCount++;
        console.log(`❌ [FivePaisa] Platinum update failed: ${platinumResult.error}`);
      }
    } catch (error: any) {
      failCount++;
      results.platinum = { success: false, error: error.message };
      console.error('❌ [FivePaisa] Platinum fetch crashed:', error);
    }

    const message = `FivePaisa sync completed: ${successCount} succeeded, ${failCount} failed`;
    console.log(`🏁 [FivePaisa] ${message}`);

    return {
      success: successCount > 0,
      results,
      message
    };
  }

  /**
   * METHOD 2: Fetch Gold + Update DB + Create JSON
   * Reusable for both automatic sync AND manual updates
   */
  async fetchAndUpdateGold(): Promise<{
    success: boolean;
    price?: number;
    error?: string;
  }> {
    console.log('🥇 [Gold] Starting fetch from 5paisa.com...');
    
    try {
      // Fetch the HTML page
      const html = await this.fetchPage(this.URLS.gold);
      
      // Extract price from HTML
      const price = this.extractPrice(html, 'gold');
      
      if (!price || price <= 0) {
        console.error('❌ [Gold] Invalid price extracted:', price);
        return { success: false, error: 'Invalid price data' };
      }

      console.log(`💰 [Gold] Extracted price: ₹${price}/10g (₹${(price / 10).toFixed(2)}/gram)`);

      // Calculate rates for different purities using market multipliers
      const pricePerGram = price / 10; // Convert per 10g to per gram
      const rates = [
        { purity: '999', price: parseFloat(pricePerGram.toFixed(2)) },
        { purity: '916', price: parseFloat((pricePerGram * 0.9167).toFixed(2)) }, // 22K market multiplier
        { purity: '750', price: parseFloat((pricePerGram * 0.7500).toFixed(2)) }, // 18K market multiplier
        { purity: '585', price: parseFloat((pricePerGram * 0.5833).toFixed(2)) } // 14K market multiplier
      ];

      console.log('📐 [Gold] Calculated rates:', rates);

      // Update database and create JSON file
      await this.metalDataService.updateMetalPrices('gold', rates);
      
      console.log('✅ [Gold] Successfully updated database and storage');

      return { success: true, price: rates[0].price };
    } catch (error: any) {
      console.error('❌ [Gold] Error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * METHOD 3: Fetch Silver + Update DB + Create JSON
   * Reusable for both automatic sync AND manual updates
   */
  async fetchAndUpdateSilver(): Promise<{
    success: boolean;
    price?: number;
    error?: string;
  }> {
    console.log('🥈 [Silver] Starting fetch from 5paisa.com...');
    
    try {
      // Fetch the HTML page
      const html = await this.fetchPage(this.URLS.silver);
      
      // Extract price from HTML
      const price = this.extractPrice(html, 'silver');
      
      if (!price || price <= 0) {
        console.error('❌ [Silver] Invalid price extracted:', price);
        return { success: false, error: 'Invalid price data' };
      }

      console.log(`💰 [Silver] Extracted price: ₹${price}/gram`);

      // Price is already per gram on 5paisa
      const pricePerGram = price;
      const rates = [
        { purity: '999', price: parseFloat(pricePerGram.toFixed(2)) },
        { purity: '925', price: parseFloat((pricePerGram * 0.925 * 0.999).toFixed(2)) } // 92.5% of 99.9%
      ];

      console.log('📐 [Silver] Calculated rates:', rates);

      // Update database and create JSON file
      await this.metalDataService.updateMetalPrices('silver', rates);
      
      console.log('✅ [Silver] Successfully updated database and storage');

      return { success: true, price: rates[0].price };
    } catch (error: any) {
      console.error('❌ [Silver] Error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * METHOD 4: Fetch Platinum + Update DB + Create JSON
   * Reusable for both automatic sync AND manual updates
   */
  async fetchAndUpdatePlatinum(): Promise<{
    success: boolean;
    price?: number;
    error?: string;
  }> {
    console.log('⚪ [Platinum] Starting fetch from 5paisa.com...');
    
    try {
      // Fetch the HTML page
      const html = await this.fetchPage(this.URLS.platinum);
      
      // Extract price from HTML
      const price = this.extractPrice(html, 'platinum');
      
      if (!price || price <= 0) {
        console.error('❌ [Platinum] Invalid price extracted:', price);
        return { success: false, error: 'Invalid price data' };
      }

      console.log(`💰 [Platinum] Extracted price: ₹${price}/10g (₹${(price / 10).toFixed(2)}/gram)`);

      // Calculate rate per gram
      const pricePerGram = price / 10; // Convert per 10g to per gram
      const rates = [
        { purity: '999', price: parseFloat(pricePerGram.toFixed(2)) },
        { purity: '950', price: parseFloat((pricePerGram * 0.95 * 0.999).toFixed(2)) }, // 95.0% of 99.9%
        { purity: '900', price: parseFloat((pricePerGram * 0.90 * 0.999).toFixed(2)) } // 90.0% of 99.9%
      ];

      console.log('📐 [Platinum] Calculated rates:', rates);

      // Update database and create JSON file
      await this.metalDataService.updateMetalPrices('platinum', rates);
      
      console.log('✅ [Platinum] Successfully updated database and storage');

      return { success: true, price: rates[0].price };
    } catch (error: any) {
      console.error('❌ [Platinum] Error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Helper: Fetch HTML page with proper headers
   */
  private async fetchPage(url: string): Promise<string> {
    console.log(`🌐 [Fetch] Requesting: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    console.log(`✅ [Fetch] Received ${html.length} bytes`);
    
    return html;
  }

  /**
   * Helper: Extract price from HTML using cheerio
   */
  private extractPrice(html: string, metal: string): number | null {
    console.log(`🔍 [Extract] Parsing HTML for ${metal} price...`);
    
    try {
      const $ = cheerio.load(html);
      let priceText = '';
      
      if (metal === 'gold') {
        // Gold uses: <div class="gold__value"><strong>₹136200</strong>...
        const priceElement = $('.gold__value strong');
        if (priceElement.length > 0) {
          priceText = priceElement.first().text().trim();
          console.log(`📄 [Extract] Found gold price in .gold__value strong: "${priceText}"`);
        }
      } else {
        // Silver and Platinum use: <div class="gold-price-page__value">₹2,400</div>
        const priceElement = $('.gold-price-page__value');
        if (priceElement.length > 0) {
          priceText = priceElement.first().text().trim();
          console.log(`📄 [Extract] Found ${metal} price in .gold-price-page__value: "${priceText}"`);
        }
      }
      
      if (!priceText) {
        console.error(`❌ [Extract] Price element not found for ${metal}`);
        return null;
      }
      
      // Remove rupee symbol, commas, and whitespace, extract number
      const cleanedText = priceText.replace(/₹|,|\s/g, '');
      const priceMatch = cleanedText.match(/\d+\.?\d*/);
      
      if (!priceMatch) {
        console.error('❌ [Extract] Could not parse price from text:', priceText);
        return null;
      }

      const price = parseFloat(priceMatch[0]);
      console.log(`✅ [Extract] Parsed price: ${price}`);
      
      return price;
    } catch (error: any) {
      console.error('❌ [Extract] Error parsing HTML:', error.message);
      return null;
    }
  }
}
