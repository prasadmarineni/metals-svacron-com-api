// MCX India scraper for live gold and silver prices
import * as XLSX from 'xlsx';
import * as cheerio from 'cheerio';

export class MCXScraperService {
  private readonly mcxExcelUrl = 'https://www.mcxindia.com/docs/default-source/market-data/spot-market-price.xlsx';
  private readonly mcxPageUrl = 'https://www.mcxindia.com/market-data/spot-market-price';
  
  // Fetch and parse MCX data
  async fetchLivePrices(): Promise<{ gold?: number; silver?: number; platinum?: number }> {
    try {
      console.log('=== Fetching MCX Spot Prices ===');
      
      // Try Excel download first
      try {
        return await this.fetchFromExcel();
      } catch (excelError) {
        console.log('⚠ Excel download failed, trying HTML scraping...');
        console.log('Excel error:', excelError);
        return await this.fetchFromHTML();
      }
      
    } catch (error) {
      console.error('✗ Error fetching from MCX:', error);
      throw error;
    }
  }
  
  // Method 1: Download and parse Excel file
  private async fetchFromExcel(): Promise<{ gold?: number; silver?: number; platinum?: number }> {
    console.log('Attempting Excel download...');
    
    const response = await fetch(this.mcxExcelUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,*/*',
        'Referer': 'https://www.mcxindia.com/market-data/spot-market-price',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Excel download failed: ${response.statusText}`);
    }

    console.log('✓ Excel file downloaded successfully');
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log(`File size: ${buffer.length} bytes`);
    
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data: any[] = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`✓ Parsed ${data.length} rows from Excel`);
    
    return this.extractPrices(data);
  }
  
  // Method 2: Scrape HTML table
  private async fetchFromHTML(): Promise<{ gold?: number; silver?: number; platinum?: number }> {
    console.log('Fetching HTML page...');
    
    const response = await fetch(this.mcxPageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTML fetch failed: ${response.statusText}`);
    }
    
    console.log('✓ HTML page fetched successfully');
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    let allData: any[] = [];
    
    // Find all table rows on current page
    $('table tbody tr').each((_, row) => {
      const $row = $(row);
      const cells = $row.find('td');
      
      if (cells.length >= 4) {
        const commodity = cells.eq(0).text().trim();
        const unit = cells.eq(1).text().trim();
        const location = cells.eq(2).text().trim();
        const spotPrice = cells.eq(3).text().trim().replace(/,/g, '').replace('Rs.', '').replace('₹', '').trim();
        
        if (commodity && spotPrice) {
          allData.push({
            'Commodity': commodity,
            'Unit': unit,
            'Location': location,
            'Spot Price (Rs.)': spotPrice
          });
        }
      }
    });
    
    console.log(`✓ Parsed ${allData.length} rows from HTML (page 1)`);
    
    // Check if there are more pages
    const paginationText = $('.pagination, .pager, [class*="page"]').text().toLowerCase();
    const hasMultiplePages = paginationText.includes('page') && (paginationText.includes('of') || paginationText.includes('next'));
    
    if (hasMultiplePages) {
      console.log('⚠ Multiple pages detected - MCX site uses ASP.NET postback pagination');
      console.log('Note: Cannot fetch additional pages via simple HTTP requests (requires form postback)');
      console.log(`Proceeding with ${allData.length} rows from first page`);
    }
    
    if (allData.length === 0) {
      throw new Error('No data found in HTML table');
    }
    
    return this.extractPrices(allData);
  }
  
  // Extract gold and silver prices from data
  private extractPrices(data: any[]): { gold?: number; silver?: number; platinum?: number } {
    // Find gold and silver prices - try multiple name variations
    const goldData = this.findCommodityPrice(data, ['GOLD', 'GOLD STANDARD', 'GOLD 999', 'GOLD (999)']);
    const silverData = this.findCommodityPrice(data, ['SILVER', 'SILVER 999', 'SILVER (999)', 'SILVER STANDARD']);
    
    const result: { gold?: number; silver?: number; platinum?: number } = {};
    
    if (goldData) {
      result.gold = goldData.pricePerGram;
      console.log(`✓ Gold: ₹${result.gold}/gram (Location: ${goldData.location})`);
    } else {
      console.log('⚠ Gold price not found in MCX data');
      console.log('Available commodities:', data.map(r => r['Commodity'] || r['COMMODITY']).filter(Boolean).join(', '));
    }
    
    if (silverData) {
      result.silver = silverData.pricePerGram;
      console.log(`✓ Silver: ₹${result.silver}/gram (Location: ${silverData.location})`);
    } else {
      console.log('⚠ Silver price not found in MCX data');
    }
    
    console.log('=== MCX Fetch Complete ===');
    return result;
  }
  
  // Find commodity price from parsed data
  private findCommodityPrice(data: any[], commodityNames: string[]): { pricePerGram: number; location: string } | null {
    for (const row of data) {
      const commodity = String(row['Commodity'] || row['COMMODITY'] || '').toUpperCase();
      const spotPrice = parseFloat(String(row['Spot Price (Rs.)'] || row['SPOT PRICE (RS.)'] || row['Price'] || '0').replace(/,/g, ''));
      const unit = String(row['Unit'] || row['UNIT'] || '').toUpperCase();
      const location = String(row['Location'] || row['LOCATION'] || 'INDIA');
      
      // Check if this row matches any of the commodity names
      if (commodityNames.some(name => commodity.includes(name)) && spotPrice > 0) {
        console.log(`Found ${commodity}: ${spotPrice} per ${unit} at ${location}`);
        
        // Convert to per gram based on unit
        let pricePerGram = spotPrice;
        
        if (unit.includes('10 GRAM') || unit.includes('10 GM') || unit.includes('10GM')) {
          pricePerGram = spotPrice / 10;
        } else if (unit.includes('KG') || unit.includes('KILOGRAM')) {
          pricePerGram = spotPrice / 1000;
        } else if (unit.includes('1 GRAM') || unit.includes('1 GM') || unit === 'GRAM' || unit === 'GM') {
          pricePerGram = spotPrice;
        }
        
        return {
          pricePerGram: Number(pricePerGram.toFixed(2)),
          location
        };
      }
    }
    
    return null;
  }
}
