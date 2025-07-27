const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
// const axios = require("axios");
const WebSocket = require('ws');
const http = require('http');

// Import routes and Firebase config
const authRoutes = require('./routes/auth');
const subscriptionRoutes = require('./routes/subscriptions');
const { db, auth } = require('./config/firebase');
const CONFIG = require('./config/appConfig');

const app = express();
app.use(cors());
app.use(express.json());

// Add route middlewares
app.use('/api/auth', authRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

// Import middleware and services
const {
  verifyAndRegisterUser,
  verifyTokenOnly,
  checkCourseGenerationLimit, 
  incrementCourseCount
} = require('./middleware/courseMiddleware');
const { checkDeviceHashCourseLimit } = require('./middleware/deviceHashMiddleware');
const userVerificationService = require('./services/userVerificationService');// User registration endpoint for anonymous users
app.post('/api/register/anonymous', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Unauthorized - No valid token provided' 
      });
    }

    const token = authHeader.split(' ')[1];
    const verification = await userVerificationService.verifyAndRegisterUser(token, 'anonymous');

    res.json({
      success: true,
      message: 'Anonymous user registered successfully',
      uid: verification.uid,
      userType: verification.userType,
      userIdentifier: verification.userIdentifier.substring(0, 8) + '...'
    });

  } catch (error) {
    console.error('❌ Anonymous user registration failed:', error);
    res.status(400).json({ 
      error: 'Registration failed', 
      details: error.message 
    });
  }
});

// User registration endpoint for premium users
app.post('/api/register/premium', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Unauthorized - No valid token provided' 
      });
    }

    const token = authHeader.split(' ')[1];
    const verification = await userVerificationService.verifyAndRegisterUser(token, 'premium');

    if (!verification.email) {
      return res.status(400).json({ 
        error: 'Premium registration requires an email address' 
      });
    }

    res.json({
      success: true,
      message: 'Premium user registered successfully',
      uid: verification.uid,
      email: verification.email,
      userType: verification.userType,
      userIdentifier: verification.email
    });

  } catch (error) {
    console.error('❌ Premium user registration failed:', error);
    res.status(400).json({ 
      error: 'Registration failed', 
      details: error.message 
    });
  }
});

// Course limits API endpoint for debugging
app.get('/api/course-limits', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Unauthorized - No valid token provided' 
      });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify token and get user info
    const verification = await userVerificationService.verifyTokenOnly(token);
    
    // Determine user identifier (UID for anonymous, email for premium)
    const courseCountService = require('./services/courseCountService');
    const userIdentifier = verification.email || verification.uid;
    const userType = verification.email ? 'premium' : 'anonymous';
    
    const limitCheck = await courseCountService.canGenerateCourse(userIdentifier, userType);
    
    res.json({
      canGenerate: limitCheck.canGenerate,
      coursesGenerated: limitCheck.count,
      limit: limitCheck.limit,
      remaining: limitCheck.remaining,
      userType: limitCheck.userType,
      userIdentifier: userIdentifier.substring(0, 8) + '...',
      resetDate: limitCheck.resetDate
    });
    
  } catch (error) {
    console.error('Error checking course limits:', error);
    res.status(500).json({ 
      error: 'Failed to check course limits', 
      details: error.message 
    });
  }
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const multer = require('multer');

const clients = new Map();

// --- Constants ---
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIMETYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp'
];

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'models/gemini-2.0-flash';

// --- Multer Configuration ---
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, Word (.doc/.docx), and images are allowed'));
    }
  }
});

// --- WebSocket Server ---
wss.on('connection', (ws) => {
  ws.on('message', (msg) => {
    try {
      const data = JSON.parse(msg);
      if (data.type === 'register' && data.requestId) {
        clients.set(data.requestId, ws);
        console.log(`Client registered: ${data.requestId}`);
      }
    } catch (e) {
      console.error('Invalid WebSocket message:', msg, e);
    }
  });

  ws.on('close', () => {
    for (const [id, clientWs] of clients.entries()) {
      if (clientWs === ws) {
        clients.delete(id);
        console.log(`Client unregistered: ${id}`);
        break;
      }
    }
  });
});


function sendProgress(requestId, message) {
  const ws = clients.get(requestId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

const retryIfInvalid = async (fn, isValid, maxRetries = 4) => {
  let result;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    result = await fn();
    if (isValid(result)) return result;
    // Exponential backoff
    await delay(Math.pow(2, attempt) * 1000); // 1s, 2s, 4s, ...
  }
  throw new Error(`Validation failed after ${maxRetries} retries.`);
};

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL = GEMINI_MODEL;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

async function getSummerizedFile({ files = [], language }) {
  let finalResult;
  // Joining file originalnames with a comma and space for better readability in the prompt
  const fileNames = files?.map(file => file.originalname).join(', ');
  const prompt = `
**Role:** You are a very detailed file summarizer.

**Task:** Summarize these files ${fileNames} very detailed without ignoring any of its content in "${language}" language.

**Output only the summary (NO Extra explanation)**
`;
  try {
    finalResult = await generateGeminiResponse(prompt, files);
  } catch (err) {
    console.warn(`❌ Error generating the file summary: ${err.message}`);
  }

  return finalResult || null;
}

// 🔸 STEP 1: Get Course Plan
async function getCoursePlan({ topic, level, time, language, sources }) {
  let finalResult;
  const sectionsCount = time <= 30 ? 4 : Math.floor(time / 10);
  const sourceInstruction = sources ? `**IMPORTANT:** The content strictly base on the provided content! Use it as sources only: ${sources}` : "";

  const prompt = `
**Role:** Course Structure Designer for a mobile learning app.

**Task:** Design a course on "${topic}" for a learner at level ${level}/10. The learner has ${time} minutes total and prefers to learn in "${language}" language.
${sourceInstruction}

**Course Structure Requirements:**
* **Sections:** ${sectionsCount} sections
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
* \`"title"\`: A short, clear section title.
* \`"complexity"\`: 1 (easy) to 5 (hard).
* \`"availableTime"\`: Time allocated in minutes.
* \`"bulletCount"\`: Number of content blocks.
* \`"bulletTitles"\`: Titles of content blocks (array of strings).

**Output Format (Strict JSON Object Only):**
\`\`\`json
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
\`\`\`
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
async function generateSection({ section, level, language, topic, sources }) {
  const bulletCount = section.bulletCount || 3;
  let finalResult;
  const sourceInstruction = sources !== null ? `**IMPORTANT:** The content strictly base on the provided source! Use it as sources only: {${sources}}` : "";
  const bulletTitlesFormatted = Array.isArray(section.bulletTitles) ? section.bulletTitles.map(title => `"${title}"`).join(', ') : '';

  const prompt = `
**Role:** Mobile Course Content Generator.

**Task:** Create a course section for a level ${level}/10 learner.
${sourceInstruction}

**Section Details:**
* **Title:** "${section.title}"
* **Topic:** "${topic}"
* **Language:** "${language}"
* **Language Tone:**
    * Simple language for low levels.
    * Complex language for high levels.
**Content Generation Rules:**
* Generate **exactly ${bulletCount} content items**.
* Use the provided content titles: **${bulletTitlesFormatted}**.
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
  try {
    const raw = await generateGeminiResponse(prompt);
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());

    const contentWithIds = await Promise.all(parsed.content.map(async (item, index) => {
      return {
        id: index,
        isDone: false,
        ...item,
        // image: imageUrl
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
    error: 'Failed to generate valid JSON or content.',
    content: [],
    test: []
  };
}

// 🔸 STEP 3: Generate Full Course (with device hash authentication)
app.post('/generate-course', checkDeviceHashCourseLimit, upload.array('files', 3), async (req, res) => {
  const { topic, level, time, language, requestId } = req.body;
  const files = req.files || [];

  // Input validation
  if (!topic && !files || !level || !time || !language || !requestId) {
    const errorMessage = 'Missing required course generation parameters: topic, level, time, language, or requestId.';
    console.error(`Client Error: ${errorMessage}`);
    sendProgress(requestId, { type: 'ERROR', current: 0, total: 0, sectionTitle: errorMessage, error: true, done: false });
    return res.status(400).json({ error: errorMessage });
  }

  try {
    let sources = null;
    if (files.length > 0) {
      sendProgress(requestId, { type: 'PROCESSING', sectionTitle: 'Summarizing provided files...', current: 0, total: 0, error: false, done: false });
      sources = await retryIfInvalid(() => getSummerizedFile({ files, language }),
        (source) => source !== null
      );
      if (!sources) {
        throw new Error('Failed to summarize files after multiple attempts.');
      }
    }

    sendProgress(requestId, { done: false, error: false, current: 0, total: 0, sectionTitle: "Generating Course Plan", type: "PLANING" });
    const coursePlan = await retryIfInvalid(() => getCoursePlan({ topic, level, time, language, sources }),
      // Adjusted validation for course plan sections based on calculated count
      (plan) => plan?.sections?.length >= (time <= 30 ? 4 : Math.floor(time / 10)) && plan?.sections !== undefined
    );

    const sectionsData = [];
    for (const [i, section] of coursePlan.sections.entries()) {
      console.log(`🛠 Generating section ${i + 1}/${coursePlan.sections.length} — "${section.title}"`);
      sendProgress(requestId, {
        type: 'PROGRESS',
        current: i + 1,
        total: coursePlan.sections.length,
        sectionTitle: section.title,
        error: false,
        done: false
      });
      const generated = await retryIfInvalid(() => generateSection({ section, level, language, topic: coursePlan.title, sources }),
        (gen) => gen?.content?.length > 0
      );
      sectionsData.push(generated);
    }

    sendProgress(requestId, { done: true, error: false, current: coursePlan.sections.length, total: coursePlan.sections.length, sectionTitle: "Generating Course Plan", type: "DONE" });

    const courseData = {
      topic: coursePlan.title,
      level,
      language,
      sections: sectionsData,
      timeAllocated: time,
      generatedAt: new Date().toISOString()
    };

    // Increment course count in JSON storage for all authenticated users
    if (req.user?.userIdentifier && req.user?.userType) {
      try {
        const courseCountService = require('./services/courseCountService');
        await courseCountService.incrementCourseCount(req.user.userIdentifier, req.user.userType);
        console.log(`🔢 Course count incremented for ${req.user.userType} user: ${req.user.userIdentifier.substring(0, 8)}...`);
      } catch (error) {
        console.error('Failed to increment course count:', error);
        // Continue without failing - course generation was successful
      }
    } else {
      console.warn('⚠️ No user identifier found - skipping course count increment');
    }

    res.json(courseData);

  } catch (error) {
    console.error('Error during course generation:', error.message);
    sendProgress(requestId, {
      type: 'ERROR',
      current: 0,
      total: 0,
      sectionTitle: error.message,
      error: true,
      done: false
    });
    res.status(500).json({ error: error.message });
  }
});

// Get user's saved courses
app.get('/api/courses', verifyTokenOnly, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const coursesSnapshot = await db.collection('courses')
      .where('userId', '==', req.user.uid)
      .orderBy('createdAt', 'desc')
      .get();

    const courses = [];
    coursesSnapshot.forEach(doc => {
      courses.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json({ courses });
  } catch (error) {
    console.error('Error fetching user courses:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// Delete a specific course
app.delete('/api/courses/:courseId', verifyTokenOnly, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { courseId } = req.params;
    
    // Verify the course belongs to the user
    const courseDoc = await db.collection('courses').doc(courseId).get();
    
    if (!courseDoc.exists) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const courseData = courseDoc.data();
    if (courseData.userId !== req.user.uid) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await db.collection('courses').doc(courseId).delete();
    
    // Update user stats
    await db.collection('users').doc(req.user.uid).update({
      'stats.totalCourses': db.FieldValue.increment(-1),
      updatedAt: new Date().toISOString()
    });

    res.json({ success: true, message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({ error: 'Failed to delete course' });
  }
});

// Check course generation limits for guests
app.get('/api/course-limits', async (req, res) => {
  try {
    const guestId = req.headers['x-guest-id'] || req.ip;
    const guestDoc = await db.collection('guests').doc(guestId).get();
    
    let coursesGenerated = 0;
    
    if (guestDoc.exists) {
      const guestData = guestDoc.data();
      
      // Reset counter if it's a new day
      const lastReset = new Date(guestData.lastReset);
      const now = new Date();
      const daysDiff = Math.floor((now - lastReset) / (1000 * 60 * 60 * 24));
      
      if (daysDiff >= 1) {
        coursesGenerated = 0;
      } else {
        coursesGenerated = guestData.coursesGenerated || 0;
      }
    }
    
    res.json({
      coursesGenerated,
      limit: CONFIG.COURSE_LIMITS.FREE_USER_MONTHLY_LIMIT,
      remaining: Math.max(0, CONFIG.COURSE_LIMITS.FREE_USER_MONTHLY_LIMIT - coursesGenerated),
      canGenerate: coursesGenerated < CONFIG.COURSE_LIMITS.FREE_USER_MONTHLY_LIMIT
    });
  } catch (error) {
    console.error('Error checking course limits:', error);
    res.status(500).json({ error: 'Failed to check limits' });
  }
});

app.post('/regenerate-lesson', async (req, res) => {
  const { language, level, bulletpoints } = req.body;

  if (!language || !level || !Array.isArray(bulletpoints) || bulletpoints.length === 0) {
    return res.status(400).json({ error: 'Missing required fields: language, level, or bulletpoints must be a non-empty array.' });
  }

  const prompt = `
**Role:** Educational Mobile Content Rewriting Engine.

**Task:** Rewrite the following bulletpoints.

**Instructions:**
* Rewrite the provided bulletpoints in **${language}** for a learner at **level ${level}/10**.
* **Crucially, maintain the original meaning and all information.**
* Ensure the rewritten content uses **mobile-friendly, clear language**.

**Input Bulletpoints (JSON array of strings):**
\`\`\`json
${JSON.stringify(bulletpoints, null, 2)}
\`\`\`
`;

  try {
    const raw = await generateGeminiResponse(prompt);
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());

    // Basic validation for the regenerated content
    if (!Array.isArray(parsed)) {
      throw new Error("Regenerated content is not a valid JSON array.");
    }
    res.json({ newBulletpoints: parsed });
  } catch (err) {
    console.error('❌ Error during regeneration:', err.message);
    res.status(500).json({ error: 'Failed to regenerate bulletpoints.' });
  }
});


// Start server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));