// const express = require('express');
// const cors = require('cors');
// require('dotenv').config();
// const { OpenAI } = require('openai');
// const { translate } = require('google-translate-api-x')
// const app = express();
// app.use(cors());
// app.use(express.json());
// const puppeteer = require('puppeteer');

// async function getFirstDuckDuckGoImageLink(query) {
//   const browser = await puppeteer.launch({
//     headless: 'new',
//     executablePath: '/opt/render/.cache/puppeteer/chrome/linux-136.0.7103.94/chrome-linux64/chrome',
//     args: ['--no-sandbox', '--disable-setuid-sandbox'], // Required in headless environments
//   });

//   const page = await browser.newPage();
//   const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`;
//   await page.goto(searchUrl, { waitUntil: 'networkidle2' });

//   await page.waitForSelector('.tile--img__img', { timeout: 10000 });

//   const imageUrl = await page.evaluate(() => {
//     const images = Array.from(document.querySelectorAll('.tile--img__img'));
//     for (let img of images) {
//       const src = img.getAttribute('src') || img.getAttribute('data-src');
//       if (src && src.startsWith('https://')) return src;
//     }
//     return null;
//   });

//   await browser.close();
//   return imageUrl;
// }


// // Constants
// const API_KEY = process.env.OPENAI_API_KEY;
// const PLAN_MODEL = "gpt-4.1-nano-2025-04-14"; // ✅ Cheaper model for plan
// const CONTENT_MODEL = "o4-mini-2025-04-16"; // ✅ Better model for long content
// const SYSTEM_ROLE = 'You generate educational course structures in JSON and follow strict prompts. Every number must be respected strictly.';

// // OpenAI client
// const openai = new OpenAI({ apiKey: API_KEY });
// const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// // ✅ STEP 1: Generate a course plan using gpt-3.5
// async function getCoursePlan(topic, level, time, language) {
//   const prompt = `
// Generate a mobile-friendly course structure.

// Topic: ${topic}
// Level: ${level} (1=Beginner, 10=Expert)
// Available time: ${time} minutes
// Language: ${language}

// Rules:
// - 3–10 sections
// - Time split across sections by complexity
// - Each section: { "title", "complexity" (1–5), "availableTime", "bulletCount" }

// 🧠 Based on:
// - The available time (${time} minutes) should be splite between the sections based on their complexity
// - Level → experts = fewer sections, beginners = more sections
// - Complexity → assign higher time budgets to more complex sections
// - Bulletpoints per section must vary based on section complexity

// Return valid JSON:
// {
//   "title" : "string",
//   "sections": [
//     { "title": "string", "complexity": number, "availableTime": number, "bulletCount": number }
//   ]
// }
// `;

//   const response = await openai.chat.completions.create({
//     model: PLAN_MODEL, // ✅ Cheaper model
//     messages: [
//       { role: 'system', content: SYSTEM_ROLE },
//       { role: 'user', content: prompt }
//     ]
//   });

//   const raw = response.choices[0].message.content.replace(/```json|```/g, '').trim();
//   const parsed = JSON.parse(raw);
//   console.log(parsed);
//   return parsed;
// }
// async function generateSection(section, level, language, topic) {
//   const bulletCount = section.bulletCount || 3;
//   let finalResult;
//   const prompt = `
// You are a mobile course content generator.

// Create a section titled "${section.title}" about "${topic}" for a level ${level}/10 learner in ${language} with ${section.availableTime} minutes available (50 words/min reading).

// Instructions:
// - Total words ≈ ${section.availableTime * 50}
// - Include ${bulletCount} contents
// - Each bulletpoint has 2–4 short paragraphs
// - Add 4-question quiz at end (1 correct + 3 wrong)
// - Time allocation per bulletpoint (based on complexity ${section.complexity}):
// - Use clear, mobile-friendly language and structure
// - NEVER INCLUDE TIMES (HOW MUCH TIME EVERY CONTETNT OR SECTION TAKES) TO THE JSON

// JSON format:
// {
//   "title": "Section Title",
//   "content": [  
//     {
//       "title": "Concept",
//       "bulletpoints": ["Para1", "Para2", "..."]
//     }
//   ],
//   "test": [
//     {
//       "question": "Question?",
//       "answer": "Correct",
//       "options": ["Correct", "Wrong", "Wrong", "Wrong"]
//     }
//   ]
// }

// Only return valid JSON.
// `;

//   try {
//     const response = await openai.chat.completions.create({
//       model: CONTENT_MODEL, // ✅ o4-mini
//       messages: [
//         { role: 'system', content: SYSTEM_ROLE },
//         { role: 'user', content: prompt }
//       ],
//     });

//     console.log(prompt);
//     const raw = response.choices[0].message.content.replace(/```json|```/g, '').trim();
//     const parsed = JSON.parse(raw);

//     const wordCount = parsed.content
//       .flatMap(c => c.bulletpoints)
//       .join(' ')
//       .split(/\s+/)
//       .filter(Boolean).length;

//     console.warn(`⚠️ "${section.title}" has ${wordCount} words (expected ${section.availableTime * 50})`);

//     const contentWithIds = await Promise.all(parsed.content.map(async (item, index) => {
//       const topicTranslated = language !== "en" ? await translate(topic, { from: language, to: 'en' }) : topic;
//       const titleTranslated = language !== "en" ? await translate(item.title, { from: language, to: 'en' }) : item.title;
//       const searchQuery = topicTranslated + " " + titleTranslated + " [education concept]";
//       let imageUrl = null;

//       try {
//         imageUrl = await getFirstDuckDuckGoImageLink(searchQuery);
//         console.log(imageUrl);
//       } catch (e) {
//         console.warn(`⚠️ Failed to fetch image for "${searchQuery}": ${e.message}`);
//       }

//       return {
//         id: index,
//         isDone: false,
//         ...item,
//         image: imageUrl
//       };
//     }));



//     // Assign isDone: false to each test question
//     const testWithIsDone = (parsed.test || []).map((item, index) => ({
//       id: index,
//       isDone: false,
//       ...item
//     }));

//     finalResult = { ...section, ...parsed, content: contentWithIds, test: testWithIsDone };
//   } catch (err) {
//     console.warn(`❌ Attempt ${attempt} failed for "${section.title}": ${err.message}`);
//     await delay(1500);
//   }

//   if (!finalResult) {
//     return {
//       ...section,
//       error: 'Failed to generate valid JSON after retries.',
//       charCountValid: false,
//       content: [],
//       test: []
//     };
//   }

//   return finalResult;
// }


// // STEP 3: Main API route
// app.post('/generate-course', async (req, res) => {
//   const { topic, level, time, language } = req.body;

//   try {
//     const coursePlan = await getCoursePlan(topic, level, time, language);
//     const sectionsData = [];

//     for (let i = 0; i < coursePlan.sections.length; i++) {
//       const section = coursePlan.sections[i];
//       console.log(`🛠 Generating section ${i + 1}/${coursePlan.sections.length} — "${section.title}"`);

//       try {
//         const generated = await generateSection(section, level, language, topic);
//         sectionsData.push(generated);
//       } catch (e) {
//         console.error(e.message);
//         sectionsData.push({ ...section, error: e.message });
//       }

//       await delay(1500); // Reduced delay
//     }

//     res.json({
//       topic: coursePlan.title,
//       level,
//       language,
//       sections: sectionsData
//     });
//   } catch (error) {
//     console.error(error.message);
//     res.status(500).json({ error: error.message });
//   }
// });

// // 🔁 Regenerate bulletpoints with same meaning but rewritten
// app.post('/regenerate-lesson', async (req, res) => {
//   const { language, level, bulletpoints } = req.body;

//   if (!language || !level || !Array.isArray(bulletpoints)) {
//     return res.status(400).json({ error: 'Missing required fields: language, level, or bulletpoints' });
//   }

//   const prompt = `
// You are a rewriting engine for educational mobile content.

// Task:
// - Rewrite the following bulletpoints in ${language} for a level ${level}/10 learner.
// - Maintain the original meaning and information.
// - Ensure mobile-friendly, clear language.

// Bulletpoints to rewrite:
// ${JSON.stringify(bulletpoints, null, 2)}

// Return format:
// [
//   "bulletpoint1", "bulletpoint2" , ...
// ]
// `;

//   try {
//     const response = await openai.chat.completions.create({
//       model: CONTENT_MODEL,
//       messages: [
//         { role: 'system', content: SYSTEM_ROLE },
//         { role: 'user', content: prompt }
//       ],
//     });

//     const raw = response.choices[0].message.content.replace(/```json|```/g, '').trim();
//     const parsed = JSON.parse(raw);

//     res.json({ newBulletpoints: parsed });
//   } catch (err) {
//     console.error('❌ Error during regeneration:', err.message);
//     res.status(500).json({ error: 'Failed to regenerate bulletpoints' });
//   }
// });


// // Start server
// const PORT = process.env.PORT || 4000;
// app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));



import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { translate } from 'google-translate-api-x';
import fetch from 'node-fetch';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Gemini setup
const genAI = new GoogleGenerativeAI('AIzaSyBNp9cTYZnCU44GryPfFIhObdmF3HK7ZuY');
const MODEL = 'models/gemini-1.5-flash-latest'; // Gemini Flash 2.5

// Utility
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getFirstWikimediaCommonsImageLinkFromAPI(query) {
  try {
    const encodedQuery = encodeURIComponent(query);
    // Request up to 50 results to have more options to filter
    const apiUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodedQuery}&gsrnamespace=6&prop=imageinfo&iiprop=url|dimensions|size|mime&format=json&origin=*&gsrlimit=50`;

    console.log(`[${new Date().toLocaleString()}] Fetching from Wikimedia Commons API for query: "${query}"`);
    console.log(`API URL: ${apiUrl}`);

    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.error) {
      console.error(`[${new Date().toLocaleString()}] Wikimedia Commons API Error: ${data.error.info}`);
      return null;
    }

    const pages = data.query && data.query.pages;

    if (!pages) {
      console.warn(`[${new Date().toLocaleString()}] No image results found for query: "${query}" from Wikimedia Commons API.`);
      return null;
    }

    const MIN_WIDTH = 150;  // Minimum width for a showable image in a mobile app
    const MIN_HEIGHT = 150; // Minimum height for a showable image in a mobile app
    const MAX_FILE_SIZE_KB = 5000; // Max file size in KB (e.g., 5MB) to avoid huge downloads

    // Iterate through the results, prioritizing larger, common image types
    const candidates = [];
    for (const pageId in pages) {
      const page = pages[pageId];
      if (page.imageinfo && page.imageinfo.length > 0) {
        const imageInfo = page.imageinfo[0];

        const imageUrl = imageInfo.url;
        const width = imageInfo.width;
        const height = imageInfo.height;
        const size = imageInfo.size; // Size in bytes
        const mime = imageInfo.mime;

        // 1. Basic URL and dimension checks
        if (!imageUrl || !imageUrl.startsWith('http') || width < MIN_WIDTH || height < MIN_HEIGHT) {
          continue; // Skip images that are too small or invalid URL
        }

        // 2. MIME type check for common image formats
        if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(mime)) {
          continue; // Skip non-standard image types or other file types
        }

        // 3. File size check (convert bytes to KB)
        if (size / 1024 > MAX_FILE_SIZE_KB) {
          // Optionally, you could try to get a thumbnail URL for larger images
          // For now, we'll just skip them.
          console.log(`[${new Date().toLocaleString()}] Skipping image due to large size (${(size / 1024 / 1024).toFixed(2)} MB): ${imageUrl}`);
          continue;
        }

        // 4. Filter out common Wikimedia UI/placeholder images (SVGs, icons)
        if (imageUrl.includes('.svg') ||
          imageUrl.includes('Question_book-new') ||
          imageUrl.includes('Magnifying_glass_icon') ||
          imageUrl.includes('Padlock-alt-green') ||
          imageUrl.includes('Privacy_policy_info') ||
          imageUrl.includes('Ambox')) { // 'Ambox' often indicates a message box icon
          continue;
        }

        // If all checks pass, add to candidates. We'll pick the 'best' later.
        candidates.push({
          url: imageUrl,
          width: width,
          height: height,
          size: size,
          mime: mime
        });
      }
    }

    if (candidates.length === 0) {
      console.warn(`[${new Date().toLocaleString()}] No suitable images found after filtering for query: "${query}" from Wikimedia Commons API.`);
      return null;
    }

    // Sort candidates to prioritize larger images (closer to screen-filling, but not excessively large)
    // You can adjust this sorting logic based on what "best" means for your app
    candidates.sort((a, b) => {
      // Prioritize higher resolution, but consider aspect ratio, or simply total pixels
      const aPixels = a.width * a.height;
      const bPixels = b.width * b.height;
      return bPixels - aPixels; // Descending order of pixels
    });

    const bestImage = candidates[0];
    console.log(`[${new Date().toLocaleString()}] Found suitable image via API for query "${query}": ${bestImage.url}`);
    console.log(`  Details: ${bestImage.width}x${bestImage.height}, ${(bestImage.size / 1024).toFixed(2)} KB, ${bestImage.mime}`);
    return bestImage.url;

  } catch (error) {
    console.error(`[${new Date().toLocaleString()}] Error in getFirstWikimediaCommonsImageLinkFromAPI for query "${query}": ${error.message}`);
    return null;
  }
}
// System instructions
const SYSTEM_ROLE = 'You generate educational course structures in JSON and follow strict prompts. Every number must be respected strictly.';

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
- ${time < 30 ? 4 : time / 10} sections
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
  "title": "a one word title",
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
        imageUrl = await getFirstWikimediaCommonsImageLinkFromAPI(searchQuery);
      } catch (e) {
        try {
          imageUrl = await getFirstWikimediaCommonsImageLinkFromAPI(titleTranslated);
        } catch (e) {
          try {
            imageUrl = await getFirstWikimediaCommonsImageLinkFromAPI(topicTranslated);
          } catch (e) {
            console.warn(`⚠️ Failed to fetch image for "${searchQuery}": ${e.message}`);
          }
        }
      }

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