const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

async function getVQDFromHTML(query) {
  const url = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iar=images&t=h_`;
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
  };

  try {
    const response = await axios.get(url, { headers });
    const html = response.data;

    // Extract vqd from the JavaScript variable in the HTML
    const match = html.match(/vqd="([^"]+)"/);
    if (match) {
      return match[1];
    } else {
      throw new Error("vqd not found in HTML");
    }
  } catch (error) {
    console.error("Failed to get vqd:", error);
  }
}

async function getImageLink(query) {
  const vqd = await getVQDFromHTML(query);
  const url = `https://duckduckgo.com/i.js?o=json&q=${encodeURIComponent(query)}&l=us-en&vqd=${encodeURIComponent(vqd)}&p=1&f=size%3ALarge`;
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
  };

  try {
    const response = await axios.get(url, { headers });
    console.log(response.data.results[0].image);
    return response.data.results[0].image;
  } catch (error) {
    console.error("Failed to get vqd:", error);
    return null;
  }
}

// Gemini setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL = 'models/gemini-1.5-flash-latest'; // Gemini Flash 2.5

// Utility
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
- Be carefull not to have doubbled content
- Final section should be a "Summary" or "Review" of the course
- Allocate available time smartly across sections based on complexity
- Each section must include:
  - "title": a short clear section title
  - "complexity": from 1 (easy) to 5 (hard)
  - "availableTime": time allocated in minutes
  - "bulletCount": how many content blocks the section should include
  - "bulletTitles": title of content blocks the section should include

Return a valid JSON object in this format:
{
  "title": "a one word title wich explains the topic ONLY",
  "sections": [
    {
      "title": "Section Title",
      "complexity": 1-5,
      "availableTime": minutes,
      "bulletCount": number,
      "bulletTitles": ["1. bulletTitle", "2. bulletTitle"]
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
- Titles of contents: ${section.bulletTitles}
- Each content should be:
  - The title (already given)
  - 2 to 4 short paragraphs (in a "bulletpoints" array) explaining the part of course concept tageted by the title
- For each content item, generate **1 multiple-choice quiz question** with 4 options (1 correct + 3 wrong)
- Quiz must include exactly ${bulletCount} questions (one per content item)
- Use clear, mobile-friendly language
- All Titles, bulletpoints, question and answers be in "${language}" language

Return this valid JSON format:
{
  "title": "Section Title",
  "content": [
    {
      "title": The title given,
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
      // const topicTranslated = language !== "en" ? await translate(topic, { from: language, to: 'en' }).then(res => res.text) : topic;
      // const titleTranslated = language !== "en" ? await translate(item.title, { from: language, to: 'en' }).then(res => res.text) : item.title;
      const searchQuery = `${topic} ${item.title}`;
      let imageUrl = null;
      try {
        imageUrl = await getImageLink(searchQuery);
      } catch (e) {
        console.warn(`⚠️ Failed to fetch image for "${searchQuery}": ${e.message}`);
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