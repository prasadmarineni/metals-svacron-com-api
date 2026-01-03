const { 
  fetchGoldPrices, 
  fetchSilverPrices, 
  fetchPlatinumPrices, 
  scrapeAllMetals 
} = require('./functions/lib/goodReturnsScraper');

async function testIndividual() {
  console.log('🧪 Testing individual metal fetchers...\n');
  
  console.log('=== Testing Gold ===');
  const gold = await fetchGoldPrices();
  console.log(JSON.stringify(gold, null, 2));
  console.log('');
  
  console.log('=== Testing Silver ===');
  const silver = await fetchSilverPrices();
  console.log(JSON.stringify(silver, null, 2));
  console.log('');
  
  console.log('=== Testing Platinum ===');
  const platinum = await fetchPlatinumPrices();
  console.log(JSON.stringify(platinum, null, 2));
  console.log('');
}

async function testCombined() {
  console.log('🧪 Testing combined scraper...\n');
  
  const startTime = Date.now();
  const result = await scrapeAllMetals();
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  console.log('\n✅ Test completed successfully!');
  console.log(`⏱️ Duration: ${duration} seconds\n`);
  console.log('📊 Final Results:');
  console.log(JSON.stringify(result, null, 2));
}

// Run tests
(async () => {
  try {
    await testCombined();
    // await testIndividual(); // Uncomment to test individual methods
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
})();
