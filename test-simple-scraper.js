/**
 * Test simple HTML scraper
 */

const { scrapeAllMetals } = require('./functions/lib/grtJewelsScraperSimple');

async function test() {
  console.log('🧪 Testing simple HTML scraper...\n');
  
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
    process.exit(1);
  }
}

test();
