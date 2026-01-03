/**
 * Local test script for GRT Jewels scraper
 * Run with: node test-scraper.js
 */

const { scrapeAllMetals } = require('./functions/lib/grtJewelsScraper');

async function test() {
  console.log('🧪 Starting local test of GRT Jewels scraper...\n');
  
  try {
    const startTime = Date.now();
    const prices = await scrapeAllMetals();
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
