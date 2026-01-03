const { scrapeAllMetals } = require('./functions/lib/goodReturnsScraperPuppeteer');

async function testPuppeteerScraper() {
  console.log('=== Testing GoodReturns Puppeteer Scraper ===\n');
  
  try {
    const result = await scrapeAllMetals();
    
    console.log('\n📊 Final Results:');
    console.log(JSON.stringify(result, null, 2));
    
    // Check if we got actual data
    const hasGold = result.gold?.['999'] !== null;
    const hasSilver = result.silver?.['999'] !== null;
    const hasPlatinum = result.platinum?.['999'] !== null;
    
    console.log('\n✅ Success Summary:');
    console.log(`  Gold: ${hasGold ? '✓' : '✗'}`);
    console.log(`  Silver: ${hasSilver ? '✓' : '✗'}`);
    console.log(`  Platinum: ${hasPlatinum ? '✓' : '✗'}`);
    
    if (hasGold && hasSilver && hasPlatinum) {
      console.log('\n🎉 All prices scraped successfully!');
      process.exit(0);
    } else {
      console.log('\n⚠️ Some prices could not be scraped');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

testPuppeteerScraper();
