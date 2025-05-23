const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { OpenAI } = require('openai');

const app = express();
app.use(cors());
app.use(express.json());

// Constants
const API_KEY = process.env.OPENAI_API_KEY;
const PLAN_MODEL = "gpt-4.1-nano-2025-04-14"; // ✅ Cheaper model for plan
const CONTENT_MODEL = "o4-mini-2025-04-16"; // ✅ Better model for long content
const SYSTEM_ROLE = 'You generate educational course structures in JSON and follow strict prompts. Every number must be respected strictly.';

// OpenAI client
const openai = new OpenAI({ apiKey: API_KEY });
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ✅ STEP 1: Generate a course plan using gpt-3.5
async function getCoursePlan(topic, level, time, language) {
  const prompt = `
Generate a mobile-friendly course structure.

Topic: ${topic}
Level: ${level} (1=Beginner, 10=Expert)
Available time: ${time} minutes
Language: ${language}

Rules:
- 3–10 sections
- Time split across sections by complexity
- Each section: { "title", "complexity" (1–5), "availableTime", "bulletCount" }

🧠 Based on:
- The available time (${time} minutes) should be splite between the sections based on their complexity
- Level → experts = fewer sections, beginners = more sections
- Complexity → assign higher time budgets to more complex sections
- Bulletpoints per section must vary based on section complexity

Return valid JSON:
{
  "sections": [
    { "title": "string", "complexity": number, "availableTime": number, "bulletCount": number }
  ]
}
`;

  const response = await openai.chat.completions.create({
    model: PLAN_MODEL, // ✅ Cheaper model
    messages: [
      { role: 'system', content: SYSTEM_ROLE },
      { role: 'user', content: prompt }
    ]
  });

  const raw = response.choices[0].message.content.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(raw);
  return parsed;
}

// ✅ STEP 2: Generate content using o4-mini
async function generateSection(section, level, language, maxRetries = 3) {
  const bulletCount = section.bulletCount || 3;
  let finalResult;
  const prompt = `
You are a mobile course content generator.

Create a section titled "${section.title}" for a level ${level}/10 learner in ${language} with ${section.availableTime} minutes available (50 words/min reading).

Instructions:
- Total words ≈ ${section.availableTime * 50}
- Include ${bulletCount} bulletpoints
- Each bulletpoint has 2–4 short paragraphs
- Add 4-question quiz at end (1 correct + 3 wrong)
- Use a public related image for every bulletpoint if neccersery
- Time allocation per bulletpoint (based on complexity ${section.complexity}):
- Use clear, mobile-friendly language and structure
- DO NOT USE ANY PLACEHOLDER AND SELFMADE LINKS TO IMAGES   
- Use image from https://images.unsplash.com
- Use a public related image for every bulletpoint if necessary
- Use only real, verified image URLs from reliable sources 
- DO NOT USE ANY PLACEHOLDER AND SELFMADE LINKS TO IMAGES OF WEKIPEDIA
- the images most be related to the content of the bulletpoint

JSON format:
{
  "title": "Section Title",
  "content": [  
    {
      "title": "Concept",
      "bulletpoint": ["Para1", "Para2", "..."],
      "image": "https://placeholder.com/image.jpg"
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

Only return valid JSON.
`;

  try {
    const response = await openai.chat.completions.create({
      model: CONTENT_MODEL, // ✅ o4-mini
      messages: [
        { role: 'system', content: SYSTEM_ROLE },
        { role: 'user', content: prompt }
      ],
    });

    const raw = response.choices[0].message.content.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(raw);

    const wordCount = parsed.content
      .flatMap(c => c.bulletpoint)
      .join(' ')
      .split(/\s+/)
      .filter(Boolean).length;

    console.warn(`⚠️ "${section.title}" has ${wordCount} words (expected ${section.availableTime * 50})`);

    // Assign unique ids and isDone: false to each content item
    const contentWithIds = parsed.content.map((item, index) => ({
      id: index,
      isDone: false,
      ...item
    }));

    // Assign isDone: false to each test question
    const testWithIsDone = (parsed.test || []).map((item, index) => ({
      id: index,
      isDone: false,
      ...item
    }));

    finalResult = { ...section, ...parsed, content: contentWithIds, test: testWithIsDone };
  } catch (err) {
    console.warn(`❌ Attempt ${attempt} failed for "${section.title}": ${err.message}`);
    await delay(1500);
  }

  if (!finalResult) {
    return {
      ...section,
      error: 'Failed to generate valid JSON after retries.',
      charCountValid: false,
      content: [],
      test: []
    };
  }

  return finalResult;
}

// STEP 3: Main API route
app.post('/generate-course', async (req, res) => {
  const { topic, level, time, language } = req.body;

  try {
    const coursePlan = await getCoursePlan(topic, level, time, language);
    const sectionsData = [];

    for (let i = 0; i < coursePlan.sections.length; i++) {
      const section = coursePlan.sections[i];
      console.log(`🛠 Generating section ${i + 1}/${coursePlan.sections.length} — "${section.title}"`);

      try {
        const generated = await generateSection(section, level, language);
        sectionsData.push(generated);
      } catch (e) {
        console.error(e.message);
        sectionsData.push({ ...section, error: e.message });
      }

      await delay(1500); // Reduced delay
    }

    res.json({
      topic,
      level,
      language,
      sections: sectionsData
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));