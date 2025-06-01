const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { OpenAI } = require('openai');
const { translate } = require('google-translate-api-x')
const app = express();
app.use(cors());
app.use(express.json());
const axios = require('axios');

const url = 'https://duckduckgo.com/';
const headers = {
    'dnt': '1',
    'accept-encoding': 'gzip, deflate, sdch',
    'x-requested-with': 'XMLHttpRequest',
    'accept-language': 'en-GB,en-US;q=0.8,en;q=0.6,ms;q=0.4',
    'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36',
    'accept': 'application/json, text/javascript, */*; q=0.01',
    'referer': 'https://duckduckgo.com/',
    'authority': 'duckduckgo.com',
};
const max_iter = 2;
const max_retries = 2;
const params_template = {
    l: "wt-wt",
    o: "json",
    q: null,
    vqd: null,
    f: ",,,",
    p: null
};

function sleep(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms)
    })
}

async function getToken(keywords) {

    let token = null;
    try {
        let res = await axios.get(url, {
            params: {
                q: keywords
            }
        })

        token = res.data.match(/vqd=([\d-]+)\&/)[1]

    } catch (error) {
        console.error(error)
    }

    return new Promise((resolve, reject) => {
        if (!token)
            reject('Failed to get token')
        resolve(token)
    })

}
async function image_search({ query, moderate, retries, iterations }) {

    let reqUrl = url + 'i.js';
    let keywords = query
    let p = moderate ? 1 : -1;      // by default moderate false
    let attempt = 0;
    if (!retries) retries = max_retries; // default to max if none provided
    if (!iterations) iterations = max_iter; // default to max if none provided

    let results = [];

    try {

        let token = await getToken(keywords);

        let params = {
            "l": "wt-wt",
            "o": "json",
            "q": keywords,
            "vqd": token,
            "f": ",,,",
            "p": "" + (p)
        }

        let data = null;
        let itr = 0;


        while (itr < iterations) {

            while (true) {
                try {

                    let response = await axios.get(reqUrl, {
                        params,
                        headers
                    })

                    data = response.data;
                    if (!data.results) throw "No results";
                    break;

                } catch (error) {
                    console.error(error)
                    attempt += 1;
                    if (attempt > retries) {
                        return new Promise((resolve, reject) => {
                            resolve(results)
                        });
                    }
                    await sleep(5000);
                    continue;
                }

            }

            results = [...results, ...data.results]
            if (!data.next) {
                return new Promise((resolve, reject) => {
                    resolve(results)
                });
            }
            reqUrl = url + data["next"];
            itr += 1;
            attempt = 0;
        }

    } catch (error) {
        console.error(error);
    }
    return results;

}


// Constants
const API_KEY = process.env.OPENAI_API_KEY;
const PLAN_MODEL = "gpt-4.1-nano-2025-04-14"; // ✅ Cheaper model for plan
const CONTENT_MODEL = "o4-mini-2025-04-16"; // ✅ Better model for long content
const SYSTEM_ROLE = 'You generate educational course structures in JSON and follow strict prompts. Every number must be respected strictly.';

// OpenAI client
const openai = new OpenAI({ apiKey: API_KEY });
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getImageLinks(query) {
    try {
        const results = await image_search({ query });

        const filtered = results.filter(img =>
            img.width >= 1024 && img.height >= 768
        );

        const imageLinks = filtered.map(img => img.image);

        return imageLinks;
    } catch (error) {
        console.error('Error:', error);
        return [];
    }
}

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
  "title" : "string",
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
  console.log(parsed);
  return parsed;
}
async function generateSection(section, level, language, topic) {
  const bulletCount = section.bulletCount || 3;
  let finalResult;
 const prompt = `
You are a mobile course content generator.

Create a section titled "${section.title}" for a level ${level}/10 learner in ${language} with ${section.availableTime} minutes available (50 words/min reading).

Instructions:
- Total words ≈ ${section.availableTime * 50}
- Include ${bulletCount} contents
- Each bulletpoint has 2–4 short paragraphs
- Add 4-question quiz at end (1 correct + 3 wrong)
- Time allocation per bulletpoint (based on complexity ${section.complexity}):
- Use clear, mobile-friendly language and structure
- NEVER INCLUDE TIMES (HOW MUCH TIME EVERY CONTETNT OR SECTION TAKES) TO THE JSON

JSON format:
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

    console.log(prompt);
    const raw = response.choices[0].message.content.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(raw);

    const wordCount = parsed.content
      .flatMap(c => c.bulletpoints)
      .join(' ')
      .split(/\s+/)
      .filter(Boolean).length;

    console.warn(`⚠️ "${section.title}" has ${wordCount} words (expected ${section.availableTime * 50})`);

    const contentWithIds = await Promise.all(parsed.content.map(async (item, index) => {
      const topicTranslated = language !== "en" ? await translate(topic, { from: language, to: 'en' }) : topic;
      const titleTranslated = language !== "en" ? await translate(item.title, { from: language, to: 'en' }) : item.title;
      const searchQuery = topicTranslated + "->" + titleTranslated + " [education concept]";
      let imageUrl = null;

      try {
        imageUrl = await getImageLinks(`${topic} ${item.title}`); // ✅ Add resolution check here      
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
        const generated = await generateSection(section, level, language, topic);
        sectionsData.push(generated);
      } catch (e) {
        console.error(e.message);
        sectionsData.push({ ...section, error: e.message });
      }

      await delay(1500); // Reduced delay
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

// 🔁 Regenerate bulletpoints with same meaning but rewritten
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
  "bulletpoint1", "bulletpoint2" , ...
]
`;

  try {
    const response = await openai.chat.completions.create({
      model: CONTENT_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_ROLE },
        { role: 'user', content: prompt }
      ],
    });

    const raw = response.choices[0].message.content.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(raw);

    res.json({ newBulletpoints: parsed });
  } catch (err) {
    console.error('❌ Error during regeneration:', err.message);
    res.status(500).json({ error: 'Failed to regenerate bulletpoints' });
  }
});


// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));