const puppeteer = require('puppeteer');
const probe = require('probe-image-size');

async function getDuckDuckGoImage(query, minWidth = 800, minHeight = 600) {
  const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`;

  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });

  // Wait for images to load
  await page.waitForSelector('.tile--img__img', { timeout: 7000 });

  const imageUrls = await page.$$eval('.tile--img__img', imgs =>
    imgs.map(img => img.getAttribute('src')).filter(src => src && src.startsWith('http'))
  );

  for (const url of imageUrls) {
    try {
      const result = await probe(url);

      if (result.width >= minWidth && result.height >= minHeight) {
        await browser.close();
        return {
          url,
          width: result.width,
          height: result.height
        };
      }
    } catch (err) {
      console.warn(`Failed to probe image: ${url} → ${err.message}`);
      continue;
    }
  }

  await browser.close();
  return null; // No good image found
}

// Example:
// getDuckDuckGoImage("solar panel", 800, 600).then(console.log);

module.exports = { getDuckDuckGoImage };
