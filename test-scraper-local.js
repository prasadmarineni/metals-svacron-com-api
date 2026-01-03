/**
 * Local test script for GRT Jewels scraper (uses regular puppeteer)
 * Run with: node test-scraper-local.js
 */

const puppeteer = require('puppeteer');

async function scrapeAllMetalsLocal() {
  let browser;
  
  try {
    console.log('🚀 Starting GRT Jewels scraper (local mode)...');
    
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    
    // Set user agent to avoid blocking
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    console.log('📡 Navigating to GRT Jewels website...');
    await page.goto('https://www.grtjewels.com/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    console.log('⏳ Waiting for page to fully load...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Try to find the dropdown with multiple selectors
    console.log('🔍 Looking for price dropdown...');
    
    let dropdownSelector = null;
    const possibleSelectors = [
      '[id="dropdown-basic-button1"]',
      '#dropdown-basic-button1',
      'button[id*="dropdown"]',
      '.dropdown-toggle',
      'button.dropdown-toggle',
      '[aria-label*="price"]',
      '[aria-label*="rate"]'
    ];
    
    for (const selector of possibleSelectors) {
      try {
        console.log(`Trying selector: ${selector}`);
        await page.waitForSelector(selector, { timeout: 5000 });
        dropdownSelector = selector;
        console.log(`✅ Found dropdown with selector: ${selector}`);
        break;
      } catch (e) {
        console.log(`❌ Selector not found: ${selector}`);
      }
    }
    
    if (!dropdownSelector) {
      // Log all buttons on page for debugging
      const buttons = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        return btns.map(btn => ({
          id: btn.id,
          className: btn.className,
          text: btn.textContent.trim().substring(0, 50)
        }));
      });
      console.log('All buttons found on page:', JSON.stringify(buttons, null, 2));
      throw new Error('Could not find price dropdown with any known selector');
    }
    
    console.log('🖱️ Clicking dropdown...');
    await page.click(dropdownSelector);
    
    // Wait for dropdown menu to appear
    await page.waitForSelector('.dropdown-menu.show', { timeout: 10000 });
    
    console.log('✅ Dropdown menu opened, extracting prices...');
    
    // Extract all prices from the dropdown
    const prices = await page.evaluate(() => {
      const results = {
        gold: {},
        silver: {},
        platinum: {}
      };
      
      // Get all dropdown items
      const items = document.querySelectorAll('.dropdown-menu.show .dropdown-item .gold-rate');
      
      items.forEach(item => {
        const text = item.textContent.trim();
        console.log('Found text:', text);
        
        // Extract price using regex
        const priceMatch = text.match(/₹\s*([\d,]+)/);
        if (!priceMatch) return;
        
        const price = parseFloat(priceMatch[1].replace(/,/g, ''));
        
        // Parse gold prices
        if (text.includes('GOLD 24 KT')) {
          results.gold['24K'] = price;
        } else if (text.includes('GOLD 22 KT')) {
          results.gold['22K'] = price;
        } else if (text.includes('GOLD 18 KT')) {
          results.gold['18K'] = price;
        } else if (text.includes('GOLD 14 KT')) {
          results.gold['14K'] = price;
        }
        // Parse platinum price
        else if (text.includes('PLATINUM')) {
          results.platinum['999'] = price;
        }
        // Parse silver price
        else if (text.includes('SILVER')) {
          results.silver['999'] = price;
        }
      });
      
      return results;
    });

    console.log('📊 Extracted raw prices:', JSON.stringify(prices, null, 2));

    // Validate that we got data
    if (!prices.gold['24K'] && !prices.silver['999'] && !prices.platinum['999']) {
      throw new Error('No prices found in dropdown menu');
    }

    // Format gold data (all purities per gram)
    const goldData = {
      '999': prices.gold['24K'] || null,
      '916': prices.gold['22K'] || null,
      '750': prices.gold['18K'] || null,
      '585': prices.gold['14K'] || null
    };

    // Format silver data (per gram, calculate 925 from 999)
    const silver999 = prices.silver['999'];
    const silverData = {
      '999': silver999 || null,
      '925': silver999 ? parseFloat((silver999 * 0.925).toFixed(2)) : null
    };

    // Format platinum data (per gram, calculate 950 and 900 from 999)
    const platinum999 = prices.platinum['999'];
    const platinumData = {
      '999': platinum999 || null,
      '950': platinum999 ? parseFloat((platinum999 * 0.95).toFixed(2)) : null,
      '900': platinum999 ? parseFloat((platinum999 * 0.90).toFixed(2)) : null
    };

    const result = {
      gold: goldData,
      silver: silverData,
      platinum: platinumData,
      source: 'GRT Jewels',
      scrapedAt: new Date().toISOString()
    };

    console.log('✅ Successfully scraped all metals from GRT Jewels');
    console.log('📦 Final result:', JSON.stringify(result, null, 2));

    await browser.close();
    return result;

  } catch (error) {
    console.error('❌ Error scraping GRT Jewels:', error.message);
    if (browser) {
      await browser.close();
    }
    throw new Error(`GRT Jewels scraper failed: ${error.message}`);
  }
}

async function test() {
  console.log('🧪 Starting local test of GRT Jewels scraper...\n');
  
  try {
    const startTime = Date.now();
    const prices = await scrapeAllMetalsLocal();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n✅ Test completed successfully!');
    console.log(`⏱️ Duration: ${duration} seconds`);
    console.log('\n📊 Final Results:');
    console.log(JSON.stringify(prices, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

test();
