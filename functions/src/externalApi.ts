// External API integration for fetching live metal prices
import { db } from './utils';

interface ApiNinjasMetalPrice {
  gold?: number;
  silver?: number;
  platinum?: number;
}

interface CommodityApiResponse {
  exchange: string;
  name: string;
  price: number;
  updated: number;
}

export class ExternalApiService {
  private apiKey: string;
  private baseUrl = 'https://api.api-ninjas.com/v1/commodityprice';

  constructor() {
    this.apiKey = process.env.API_NINJAS_KEY || '';
  }

  // Fetch API key from Firebase (for admin configuration)
  async getApiKey(): Promise<string> {
    if (this.apiKey) return this.apiKey;
    
    const snapshot = await db.ref('config/apiNinjasKey').once('value');
    return snapshot.val() || '';
  }

  // Fetch single commodity price
  private async fetchCommodity(name: string): Promise<number | null> {
    try {
      const apiKey = await this.getApiKey();
      
      if (!apiKey) {
        console.error('API Ninjas key not configured');
        return null;
      }

      console.log(`Fetching ${name} price from API Ninjas...`);
      const url = `${this.baseUrl}?name=${name.toLowerCase()}`;
      console.log(`API URL: ${url}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Api-Key': apiKey,
          'Content-Type': 'application/json'
        }
      });

      console.log(`API Response Status for ${name}: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Ninjas error for ${name}: ${errorText}`);
        return null;
      }

      const data: CommodityApiResponse = await response.json();
      console.log(`✓ ${name} price received:`, data);
      
      // Convert from troy ounce to per gram (API Ninjas returns troy ounce)
      const pricePerGram = this.convertToPerGram(data.price);
      console.log(`✓ ${name} converted to per gram: ${pricePerGram}`);
      
      return pricePerGram;
    } catch (error) {
      console.error(`Error fetching ${name} from API Ninjas:`, error);
      return null;
    }
  }

  // Fetch live prices from API Ninjas
  async fetchLivePrices(): Promise<ApiNinjasMetalPrice> {
    console.log('=== Starting API Ninjas Price Fetch ===');
    
    try {
      // NOTE: Gold and Silver require premium API Ninjas subscription
      // Only Platinum is available in free tier
      // Using null for gold/silver will trigger mock data fallback in priceSync
      
      const [platinum] = await Promise.all([
        this.fetchCommodity('platinum')
      ]);

      console.log('=== API Ninjas Fetch Results ===');
      console.log('Platinum:', platinum);
      console.log('Gold & Silver: Premium tier only - will use mock data');
      
      return {
        platinum: platinum || undefined,
        gold: undefined,  // Premium only
        silver: undefined // Premium only
      };
    } catch (error) {
      console.error('Error in fetchLivePrices:', error);
      throw error;
    }
  }

  // Convert from troy ounce to per gram (API Ninjas uses troy ounce)
  // 1 troy ounce = 31.1035 grams
  private convertToPerGram(pricePerOunce: number): number {
    return Number((pricePerOunce / 31.1035).toFixed(2));
  }

  // Convert USD to INR (configurable exchange rate)
  async convertToINR(usdPrice: number): Promise<number> {
    const exchangeRateSnapshot = await db.ref('config/usdToInrRate').once('value');
    const exchangeRate = exchangeRateSnapshot.val() || 83.5; // Default INR rate
    
    return Number((usdPrice * exchangeRate).toFixed(2));
  }

  // Get schedule configuration from database
  async getScheduleConfig() {
    const snapshot = await db.ref('config/schedule').once('value');
    return snapshot.val() || {
      enabled: true,
      frequency: '0,30 9 * * * and 0 10 * * * and 55 11 * * *',
      timezone: 'Asia/Kolkata',
      lastRun: null
    };
  }

  // Update schedule configuration
  async updateScheduleConfig(config: {
    enabled?: boolean;
    frequency?: string;
    timezone?: string;
  }) {
    await db.ref('config/schedule').update(config);
  }
}
