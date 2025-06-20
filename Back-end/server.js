const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require("axios");
const WebSocket = require('ws');
const http = require('http');
const app = express();
app.use(cors());
app.use(express.json());
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const multer = require('multer');
// const { execFile } = require('child_process');
// const fs = require('fs/promises');
// const path = require('path');
// const os = require('os');
// const sharp = require('sharp');

const clients = new Map(); // requestId -> ws

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, Word (.doc/.docx), and images are allowed'));
    }
  }
});

wss.on('connection', (ws) => {
  ws.on('message', (msg) => {
    try {
      const data = JSON.parse(msg);
      if (data.type === 'register' && data.requestId) {
        clients.set(data.requestId, ws);
        console.log(`Client registered: ${data.requestId + " | " + ws}`);
      }
    } catch (e) {
      console.error('Invalid message:', msg);
    }

    ws.on('close', () => {
      for (const [id, clientWs] of clients) {
        if (clientWs === ws) clients.delete(id);
      }
    });
  });
});


// async function compressFile(file) {
//   const type = file.mimetype;
//   const originalSize = file.buffer.length;
//   let compressedBuffer = file.buffer;
//   let newMimeType = file.mimetype;

//   try {
//     // 🔹 1. Compress Images (convert to webp for max compression)
//     if (type.startsWith('image/')) {
//       compressedBuffer = await sharp(file.buffer)
//         .resize({ width: 1000 }) // Adjust size to optimize further
//         .webp({ quality: 50 })   // Use WebP with lower quality
//         .toBuffer();
//       newMimeType = 'image/webp';
//     }

//     // 🔹 2. Compress PDFs using Ghostscript
//     else if (type === 'application/pdf') {
//       const inputPath = path.join(os.tmpdir(), `input-${Date.now()}.pdf`);
//       const outputPath = path.join(os.tmpdir(), `output-${Date.now()}.pdf`);

//       await fs.writeFile(inputPath, file.buffer);

//       await new Promise((resolve, reject) => {
//         execFile('gs', [
//           '-sDEVICE=pdfwrite',
//           '-dCompatibilityLevel=1.4',
//           '-dPDFSETTINGS=/screen',  // Use /ebook for slightly better quality
//           '-dNOPAUSE',
//           '-dQUIET',
//           '-dBATCH',
//           `-sOutputFile=${outputPath}`,
//           inputPath
//         ], (error) => {
//           if (error) return reject(error);
//           resolve();
//         });
//       });

//       compressedBuffer = await fs.readFile(outputPath);
//     }

//     return {
//       ...file,
//       buffer: compressedBuffer,
//       mimetype: newMimeType,
//       originalSize,
//       compressedSize: compressedBuffer.length
//     };
//   } catch (err) {
//     console.warn(`⚠️ Compression failed for ${file.originalname}: ${err.message}`);
//     return {
//       ...file,
//       originalSize,
//       compressedSize: originalSize
//     };
//   }
// }


function sendProgress(requestId, message) {
  const ws = clients.get(requestId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

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

async function isImageUrl(url) {
  try {
    const response = await axios.get(url, {
      method: 'HEAD', // Use HEAD to avoid downloading the full image
      validateStatus: () => true, // Don't throw on HTTP errors
    });

    const contentType = response.headers['content-type'];
    return contentType && contentType.startsWith('image/');
  } catch (error) {
    return false;
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
    const results = response.data.results;

    for (const item of results) {
      if (item.image && await isImageUrl(item.image) && !item.image.includes("ytimg.com") && item.height <= (item.width * 2)) {
        return item.image;
      }
    }
    return null;
  } catch (error) {
    console.error('Error fetching or checking images:', error.message);
    return null;
  }
}

// Gemini setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL = 'models/gemini-1.5-flash-latest'; 
// const MODEL = 'models/gemini-2.5-flash';

// Utility
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 🔹 Gemini prompt call wrapper
async function generateGeminiResponse(prompt, files = []) {
  const model = genAI.getGenerativeModel({ model: MODEL });
  const parts = [
    { text: prompt },
    ...files.map(file => ({
      inlineData: {
        data: file.buffer.toString('base64'),
        mimeType: file.mimetype
      }
    }))
  ];
  const result = await model.generateContent({ contents: [{ role: 'user', parts }] });
  return (await result.response).text();
}

async function getSummerizedFile({ files = [] , language}) {
  let finalResult;
  const prompt = `
**Role:** You are a very detailed file summerizer.

**Task:** Summerize this files ${files.map(file => file.originalname + ", ")} very detailed without ignoring any of its content in "${language}" language.

**Output only the summery (NO Extra explanition)**
`;
  try {
    const raw = await generateGeminiResponse(prompt, files);
    finalResult = raw;
  } catch (err) {
    console.warn(`❌ Error generating the course plan: ${err.message}`);
  }

  return finalResult || null;
}

// 🔸 STEP 1: Get Course Plan
async function getCoursePlan({ topic, level, time, language, sources }) {
  let finalResult;
  const prompt = `
**Role:** Course Structure Designer for a mobile learning app.

**Task:** Design a course on "${topic}" for a learner at level ${level}/10. The learner has ${time} minutes total and prefers to learn in "${language}" language.
${sources !== null ? "**IMPORTANT:** The content strictly base on the provided content! Use it as sources only: " + sources : ""}

**Course Structure Requirements:**
* **Sections:** ${time <= 30 ? 4 : time / 10} sections
* **Language Tone:**
    * Simple language for low levels.
    * Complex language for high levels.
* **Titles:** Course title and section titles must be in "${language}".
* **Flow:**
    * Start with an "Introduction" section.
    * Progress from easier to harder topics.
    * Avoid duplicated content.
    * Final section: "Summary" or "Review" of the course.
* **Time Allocation:** Smartly allocate available time across sections based on complexity.

**Each Section Must Include (JSON Fields):**
* ${"`"}"title"${"`"}: A short, clear section title.
* ${"`"}"complexity"${"`"}: 1 (easy) to 5 (hard).
* ${"`"}"availableTime"${"`"}: Time allocated in minutes.
* ${"`"}"bulletCount"${"`"}: Number of content blocks.
* ${"`"}"bulletTitles"${"`"}: Titles of content blocks (array of strings).

**Output Format (Strict JSON Object Only):**
${"```"}json
{
  "title": "a one word title which explains the topic ONLY",
  "sections": [
    {
      "title": "Section Title",
      "complexity": 1-5,
      "availableTime": minutes,
      "bulletCount": number,
      "bulletTitles": ["first bulletTitle", "second bulletTitle"]
    }
  ]
}
`;
  try {
    const raw = await generateGeminiResponse(prompt);
    const json = raw.replace(/```json|```/g, '').trim();
    finalResult = JSON.parse(json);
  } catch (err) {
    console.warn(`❌ Error generating the course plan: ${err.message}`);
  }

  return finalResult || {
    error: 'Failed to generate valid JSON.',
    content: [],
    test: []
  };
}

// 🔸 STEP 2: Generate Section Content
async function generateSection({ section, level, language, topic, sectionCount, requestId, sectionNumber, sources }) {
  const bulletCount = section.bulletCount || 3;
  let finalResult;
  const prompt = `
**Role:** Mobile Course Content Generator.

**Task:** Create a course section for a level ${level}/10 learner.
${sources !== null ? "**IMPORTANT:** The content strictly base on the provided source! Use it as sources only: " + sources : ""}

**Section Details:**
* **Title:** "${section.title}"
* **Topic:** "${topic}"
* **Language:** "${language}"
* **Duration:** ${section.availableTime} minutes (target ${section.availableTime * 50} words total, assuming 50 words/min reading).

**Content Generation Rules:**
* Generate **exactly ${bulletCount} content items**.
* Use the provided content titles: **${section.bulletTitles.map(title => title + ", ")}**.
* Each content item must include:
    * Its given title.
    * **2 to 4 short paragraphs** explaining the concept, provided as strings within a "bulletpoints" array.
* Use **clear, mobile-friendly language**.
* All content (titles, bulletpoints) must be in "${language}".

**Quiz Generation Rules:**
* Generate **exactly ${bulletCount} multiple-choice quiz questions**, one per content item.
* Each question must have **4 options**: 1 correct and 3 incorrect.
* All questions and answers must be in "${language}".

**Output Format (Strict JSON Object Only):**
${"```"}json
{
  "title": "Section Title",
  "content": [
    {
      "title": "The title given",
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
console.log(prompt);
  try {
    sendProgress(requestId, {
      type: 'progress',
      current: sectionNumber + 1,
      total: sectionCount,
      sectionTitle: section.title,
      error: false
    });
    const raw = await generateGeminiResponse(prompt);
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    const contentWithIds = await Promise.all(parsed.content.map(async (item, index) => {
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
    sendProgress(requestId, {
      type: 'progress',
      current: sectionNumber,
      total: sectionCount,
      sectionTitle: section.title,
      error: false
    });
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
app.post('/generate-course', upload.array('files', 3), async (req, res) => {
  const { topic, level, time, language, requestId } = req.body;
  const files = req.files || [];
  // const compressedFiles = await Promise.all(
  //   files.map(file => compressFile(file))
  // );
  const retryIfInvalid = async (fn, isValid, maxRetries = 2) => {
    let result;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      result = await fn();
      if (isValid(result)) return result;
      await delay(2000);
    }
    throw new Error("Validation failed after retries.");
  };
  try {
    let sources = null;
    if (files.length > 0) {
      sources = await retryIfInvalid(() => getSummerizedFile({ files, language }),
        (source) => source !== null
      );
    }
    sendProgress(requestId, { current: 0, total: 0, sectionTitle: "", type: "planing" });
    const coursePlan = await retryIfInvalid(() => getCoursePlan({ topic, level, time, language, sources }),
      (plan) => plan?.sections?.length >= 4 && plan?.sections !== undefined
    );
    const sectionsData = [];
    for (const [i, section] of coursePlan.sections.entries()) {
      console.log(`🛠 Generating section ${i + 1}/${coursePlan.sections.length} — "${section.title}"`);
      const generated = await retryIfInvalid(() => generateSection({ section, level, language, topic, sectionCount: coursePlan.sections.length, requestId, sectionNumber: i, sources }),
        (gen) => gen?.content?.length > 0
      );
      sectionsData.push(generated);
    }

    sendProgress(requestId, { type: 'done', done: true, error: false });

    res.json({
      topic: coursePlan.title,
      level,
      language,
      sections: sectionsData
    });

  } catch (error) {
    sendProgress(requestId, {
      type: 'error',
      current: 0,
      total: 0,
      sectionTitle: error.message,
      error: true
    });
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
**Role:** Educational Mobile Content Rewriting Engine.

**Task:** Rewrite the following bulletpoints.

**Instructions:**
* Rewrite the provided bulletpoints in **${language}** for a learner at **level ${level}/10**.
* **Crucially, maintain the original meaning and all information.**
* Ensure the rewritten content uses **mobile-friendly, clear language**.

**Input Bulletpoints (JSON array of strings):**
${"```"}json
${JSON.stringify(bulletpoints, null, 2)}
`;

  try {
    const raw = await generateGeminiResponse(prompt);
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    res.json({ newBulletpoints: parsed });
  } catch (err) {
    console.error('❌ Error during regeneration:', err.message)
    res.status(500).json({ error: 'Failed to regenerate bulletpoints' });
  }
});


// Start server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));