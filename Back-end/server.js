const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { translate } = require('google-translate-api-x')
const { GoogleGenerativeAI } = require('@google/generative-ai');
const puppeteer = require('puppeteer');
// import fetch from 'node-fetch';

const app = express();
app.use(cors());
app.use(express.json());

// Gemini setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL = 'models/gemini-1.5-flash-latest'; // Gemini Flash 2.5

// Utility
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// async function getFirstWikimediaCommonsImageLinkFromAPI(query) {
//   try {
//     const encodedQuery = encodeURIComponent(query);
//     // Request up to 50 results to have more options to filter
//     const apiUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodedQuery}&gsrnamespace=6&prop=imageinfo&iiprop=url|dimensions|size|mime&format=json&origin=*&gsrlimit=50`;

//     console.log(`[${new Date().toLocaleString()}] Fetching from Wikimedia Commons API for query: "${query}"`);
//     console.log(`API URL: ${apiUrl}`);

//     const response = await fetch(apiUrl);
//     const data = await response.json();

//     if (data.error) {
//       console.error(`[${new Date().toLocaleString()}] Wikimedia Commons API Error: ${data.error.info}`);
//       return null;
//     }

//     const pages = data.query && data.query.pages;

//     if (!pages) {
//       console.warn(`[${new Date().toLocaleString()}] No image results found for query: "${query}" from Wikimedia Commons API.`);
//       return null;
//     }

//     const MIN_WIDTH = 150;  // Minimum width for a showable image in a mobile app
//     const MIN_HEIGHT = 150; // Minimum height for a showable image in a mobile app
//     const MAX_FILE_SIZE_KB = 5000; // Max file size in KB (e.g., 5MB) to avoid huge downloads

//     // Iterate through the results, prioritizing larger, common image types
//     const candidates = [];
//     for (const pageId in pages) {
//       const page = pages[pageId];
//       if (page.imageinfo && page.imageinfo.length > 0) {
//         const imageInfo = page.imageinfo[0];

//         const imageUrl = imageInfo.url;
//         const width = imageInfo.width;
//         const height = imageInfo.height;
//         const size = imageInfo.size; // Size in bytes
//         const mime = imageInfo.mime;

//         // 1. Basic URL and dimension checks
//         if (!imageUrl || !imageUrl.startsWith('http') || width < MIN_WIDTH || height < MIN_HEIGHT) {
//           continue; // Skip images that are too small or invalid URL
//         }

//         // 2. MIME type check for common image formats
//         if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(mime)) {
//           continue; // Skip non-standard image types or other file types
//         }

//         // 3. File size check (convert bytes to KB)
//         if (size / 1024 > MAX_FILE_SIZE_KB) {
//           // Optionally, you could try to get a thumbnail URL for larger images
//           // For now, we'll just skip them.
//           console.log(`[${new Date().toLocaleString()}] Skipping image due to large size (${(size / 1024 / 1024).toFixed(2)} MB): ${imageUrl}`);
//           continue;
//         }

//         // 4. Filter out common Wikimedia UI/placeholder images (SVGs, icons)
//         if (imageUrl.includes('.svg') ||
//           imageUrl.includes('Question_book-new') ||
//           imageUrl.includes('Magnifying_glass_icon') ||
//           imageUrl.includes('Padlock-alt-green') ||
//           imageUrl.includes('Privacy_policy_info') ||
//           imageUrl.includes('Ambox')) { // 'Ambox' often indicates a message box icon
//           continue;
//         }

//         // If all checks pass, add to candidates. We'll pick the 'best' later.
//         candidates.push({
//           url: imageUrl,
//           width: width,
//           height: height,
//           size: size,
//           mime: mime
//         });
//       }
//     }

//     if (candidates.length === 0) {
//       console.warn(`[${new Date().toLocaleString()}] No suitable images found after filtering for query: "${query}" from Wikimedia Commons API.`);
//       return null;
//     }

//     // Sort candidates to prioritize larger images (closer to screen-filling, but not excessively large)
//     // You can adjust this sorting logic based on what "best" means for your app
//     candidates.sort((a, b) => {
//       // Prioritize higher resolution, but consider aspect ratio, or simply total pixels
//       const aPixels = a.width * a.height;
//       const bPixels = b.width * b.height;
//       return bPixels - aPixels; // Descending order of pixels
//     });

//     const bestImage = candidates[0];
//     console.log(`[${new Date().toLocaleString()}] Found suitable image via API for query "${query}": ${bestImage.url}`);
//     console.log(`  Details: ${bestImage.width}x${bestImage.height}, ${(bestImage.size / 1024).toFixed(2)} KB, ${bestImage.mime}`);
//     return bestImage.url;

//   } catch (error) {
//     console.error(`[${new Date().toLocaleString()}] Error in getFirstWikimediaCommonsImageLinkFromAPI for query "${query}": ${error.message}`);
//     return null;
//   }
// }

// --- DuckDucGo Image Search Function (Puppeteer-based) ---
async function getFirstDuckDuckGoImageLink(query) {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/opt/render/.cache/puppeteer/chrome/linux-136.0.7103.94/chrome-linux64/chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'], // Required in headless environments
  });

    const page = await browser.newPage();
    // await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36');
    // await page.setViewport({ width: 1366, height: 768 });

    const searchUrl = `https://duckduckgo.com/?t=h_&q=${encodeURIComponent(query)}&ia=images&iax=images&iaf=size%3ALarge`; // Using Large size filter
    // console.log(`[${new Date().toLocaleString()}] Attempting to navigate directly to image results: ${searchUrl}`); // Removed log

    try {
      await page.goto(searchUrl, { waitUntil: 'networkidle2'});
      // await page.goto(searchUrl, { waitUntil: 'networkidle0', timeout: 90000 });
      // console.log(`[${new Date().toLocaleString()}] Successfully navigated to: ${page.url()}`); // Removed log

    } catch (navigationError) {
      console.error(`Initial navigation to DuckDuckGo Images failed: ${navigationError.message}`); // Simplified error log
      // await page.screenshot({ path: `./ddg_nav_fail_debug_${Date.now()}.png`, fullPage: true });
      // console.log(`[${new Date().toLocaleString()}] Screenshot of failed navigation saved.`); // Removed log
      return null;
    }

    // --- Attempt to dismiss any potential popups ---
    // console.log(`[${new Date().toLocaleString()}] Attempting to dismiss browser promo popup...`); // Removed log
    try {
      const closeButtonSelector = '[data-testid="serp-popover-promo-close"]';
      const promoBannerSelector = '.ddg-extension-promo, #browser-promo-banner, .js-modal-modern.modal-flex.modal-popout, .ddg-promo-modal, .badge-link, .modal-themed, [data-testid*="popover-promo"]';

      const dismissButton = await page.waitForSelector(closeButtonSelector, { visible: true, timeout: 5000 }).catch(() => null);
      if (dismissButton) {
        // console.log(`[${new Date().toLocaleString()}] Clicking browser promo dismiss button: ${closeButtonSelector}`); // Removed log
        await dismissButton.click();
        await delay(1000);
      } else {
        const promoBanner = await page.waitForSelector(promoBannerSelector, { visible: true, timeout: 5000 }).catch(() => null);
        if (promoBanner) {
          // console.log(`[${new Date().toLocaleString()}] Hiding browser promo banner via JS: ${promoBannerSelector}`); // Removed log
          await page.evaluate((selector) => {
            const banner = document.querySelector(selector);
            if (banner) {
              banner.style.display = 'none';
            }
          }, promoBannerSelector);
          await delay(500);
        } else {
          // console.log(`[${new Date().toLocaleString()}] Browser promo popup not found or not visible.`); // Removed log
        }
      }
    } catch (popupError) {
      console.warn(`Failed to dismiss popup gracefully: ${popupError.message}`); // Simplified warning log
    }

    // const screenshotPathPostPopup = `./ddg_images_debug_post_popup_${Date.now()}.png`;
    // await page.screenshot({ path: screenshotPathPostPopup, fullPage: true });
    // console.log(`[${new Date().toLocaleString()}] Screenshot (after popup dismissed) saved to: ${screenshotPathPostPopup}`); // Removed log

    // --- Wait for any image element to be loaded before clicking ---
    const firstImageSelector = 'img'; // Selector to get any <img> tag
    try {
      await page.waitForSelector(firstImageSelector, { visible: true, timeout: 15000 });
      // console.log(`[${new Date().toLocaleString()}] An image element is visible on the results page.`); // Removed log
    } catch (selectorError) {
      console.error(`No image elements found or visible on results page: ${selectorError.message}`); // Simplified error log
      // await page.screenshot({ path: `./ddg_no_images_found_debug_${Date.now()}.png`, fullPage: true });
      return null;
    }

    // --- Click the first image found ---
    // console.log(`[${new Date().toLocaleString()}] Attempting to click the first image element.`); // Removed log
    try {
      await page.click(firstImageSelector);
      // Wait a short moment for the overlay to start appearing
      await delay(1000);
      // console.log(`[${new Date().toLocaleString()}] First image element clicked. Waiting for overlay...`); // Removed log
    } catch (clickError) {
      console.error(`Failed to click the first image element: ${clickError.message}`); // Simplified error log
      // await page.screenshot({ path: `./ddg_first_image_click_fail_${Date.now()}.png`, fullPage: true });
      return null;
    }

    // --- Wait for the image overlay/lightbox to appear ---
    const imageOverlaySelector = 'aside';

    try {
      await page.waitForSelector(imageOverlaySelector, { visible: true, timeout: 15000 });
      // console.log(`[${new Date().toLocaleString()}] Image overlay (aside element) is visible.`); // Removed log
    } catch (overlayError) {
      console.error(`Image overlay (aside element) did not appear or timed out: ${overlayError.message}`); // Simplified error log
      // await page.screenshot({ path: `./ddg_overlay_not_found_debug_${Date.now()}.png`, fullPage: true });
      return null;
    }

    // --- Extract the high-resolution image URL from the overlay ---
    const largeImageSrcSelector = 'aside img';

    const imageUrl = await page.evaluate((selector) => {
      const imgElement = document.querySelector(selector);
      if (imgElement) {
        return imgElement.src || imgElement.getAttribute('data-src') || imgElement.getAttribute('data-url');
      }
      return null;
    }, largeImageSrcSelector);

    if (!imageUrl) {
      console.warn(`Could not extract image URL from the overlay (using '${largeImageSrcSelector}').`); // Simplified warning log
      // await page.screenshot({ path: `./ddg_image_url_extract_fail_${Date.now()}.png`, fullPage: true });
      return null;
    }

    // console.log(`[${new Date().toLocaleString()}] Successfully extracted image URL: ${imageUrl}`); // Removed log

    // --- Debugging: Screenshot after extracting URL from overlay ---
    // const screenshotPathAfterExtraction = `./ddg_after_image_extraction_${Date.now()}.png`;
    // await page.screenshot({ path: screenshotPathAfterExtraction, fullPage: true });
    // console.log(`[${new Date().toLocaleString()}] Screenshot after image extraction saved to: ${screenshotPathAfterExtraction}`); // Removed log
    await browser.close();
    return imageUrl;
}

// 🔹 Gemini prompt call wrapper
async function generateGeminiResponse(prompt) {
  const model = genAI.getGenerativeModel({ model: MODEL });
  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

// 🔸 STEP 1: Get Course Plan
async function getCoursePlan(topic, level, time, language) {
  const prompt = `
You are a course structure designer for a mobile learning app.

Design a course on "${topic}" for a learner at level ${level}/10. The learner has ${time} minutes total and prefers to learn in "${language}" language.

✅ Course Structure Rules:
- ${time <= 30 ? 4 : time / 10} sections
- Use a simple language if the level low 
- Use a complex language if the level high
- Course title and section title must be in "${language}" language
- Must start with an "Introduction" section
- Should progress from easier to harder topics
- Final section should be a "Summary" or "Review" of the course
- Allocate available time smartly across sections based on complexity
- Each section must include:
  - "title": a short clear section title
  - "complexity": from 1 (easy) to 5 (hard)
  - "availableTime": time allocated in minutes
  - "bulletCount": how many content blocks the section should include

Return a valid JSON object in this format:
{
  "title": "a one word title wich explains the topic ONLY",
  "sections": [
    {
      "title": "Section Title",
      "complexity": 1-5,
      "availableTime": minutes,
      "bulletCount": number
    }
  ]
}
`;

  const raw = await generateGeminiResponse(prompt);
  const json = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(json);
}

// 🔸 STEP 2: Generate Section Content
async function generateSection(section, level, language, topic) {
  const bulletCount = section.bulletCount || 3;
  let finalResult;

  const prompt = `
You are a mobile course content generator.

Create a section titled "${section.title}" about "${topic}" for a level ${level}/10 learner in "${language}" language with ${section.availableTime} minutes available (50 words/min reading).

Instructions:
- The sections must have ${section.availableTime * 50} words
- Generate exactly ${bulletCount} contents
- Each content should be:
  - A "title" (string)
  - 2 to 4 short paragraphs (in a "bulletpoints" array)
- For each content item, generate **1 multiple-choice quiz question** with 4 options (1 correct + 3 wrong)
- Quiz must include exactly ${bulletCount} questions (one per content item)
- Use clear, mobile-friendly language
- All Titles, bulletpoints, question and answers be in "${language}" language

Return this valid JSON format:
{
  "title": "Section Title",
  "content": [
    {
      "title": "Concept",
      "bulletpoints": ["Para1", "Para2", "..."]
    }
  ],
  "test": [
    {
      "question": "Question?",
      "answer": "Correct",
      "options": ["Correct", "Wrong", "Wrong", "Wrong"]
    }
  ]
}
`;

  try {
    const raw = await generateGeminiResponse(prompt);
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());

    const contentWithIds = await Promise.all(parsed.content.map(async (item, index) => {
      const topicTranslated = language !== "en" ? await translate(topic, { from: language, to: 'en' }).then(res => res.text) : topic;
      const titleTranslated = language !== "en" ? await translate(item.title, { from: language, to: 'en' }).then(res => res.text) : item.title;
      const searchQuery = `${topicTranslated} ${titleTranslated}`;
      let imageUrl = null;
      try {
        imageUrl = await getFirstDuckDuckGoImageLink(searchQuery)
        // imageUrl = await getFirstWikimediaCommonsImageLinkFromAPI(searchQuery)
        // } catch (e) {
        //   try {
        //     imageUrl = await getFirstWikimediaCommonsImageLinkFromAPI(titleTranslated);
        //   } catch (e) {
        //     try {
        //       imageUrl = await getFirstWikimediaCommonsImageLinkFromAPI(topicTranslated);
      } catch (e) {
        console.warn(`⚠️ Failed to fetch image for "${searchQuery}": ${e.message}`);
      }
      //   }
      // }

      return {
        id: index,
        isDone: false,
        ...item,
        image: imageUrl
      };
    }));

    const testWithIsDone = (parsed.test || []).map((item, index) => ({
      id: index,
      isDone: false,
      ...item
    }));

    finalResult = { ...section, ...parsed, content: contentWithIds, test: testWithIsDone };
  } catch (err) {
    console.warn(`❌ Error generating "${section.title}": ${err.message}`);
  }

  return finalResult || {
    ...section,
    error: 'Failed to generate valid JSON.',
    content: [],
    test: []
  };
}

// 🔸 STEP 3: Generate Full Course
app.post('/generate-course', async (req, res) => {
  const { topic, level, time, language } = req.body;

  try {
    const coursePlan = await getCoursePlan(topic, level, time, language);
    const sectionsData = [];

    for (let i = 0; i < coursePlan.sections.length; i++) {
      const section = coursePlan.sections[i];
      console.log(`🛠 Generating section ${i + 1}/${coursePlan.sections.length} — "${section.title}"`);
      const generated = await generateSection(section, level, language, topic);
      sectionsData.push(generated);
      await delay(1500);
    }

    res.json({
      topic: coursePlan.title,
      level,
      language,
      sections: sectionsData
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: error.message });
  }
});

// 🔁 Rewrite Bulletpoints
app.post('/regenerate-lesson', async (req, res) => {
  const { language, level, bulletpoints } = req.body;

  if (!language || !level || !Array.isArray(bulletpoints)) {
    return res.status(400).json({ error: 'Missing required fields: language, level, or bulletpoints' });
  }

  const prompt = `
You are a rewriting engine for educational mobile content.

Task:
- Rewrite the following bulletpoints in ${language} for a level ${level}/10 learner.
- Maintain the original meaning and information.
- Ensure mobile-friendly, clear language.

Bulletpoints to rewrite:
${JSON.stringify(bulletpoints, null, 2)}

Return format:
[
  "bulletpoint1", "bulletpoint2", ...
]
`;

  try {
    const raw = await generateGeminiResponse(prompt);
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    res.json({ newBulletpoints: parsed });
  } catch (err) {
    console.error('❌ Error during regeneration:', err.message);
    res.status(500).json({ error: 'Failed to regenerate bulletpoints' });
  }
});

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));