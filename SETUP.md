# 🔧 Setup Instructions

## Quick Start

1. **Clone and Install Dependencies**
   ```bash
   git clone https://github.com/ahmousavi39/Learn-Ai.git
   cd Learn-Ai
   ```

2. **Backend Setup**
   ```bash
   cd Back-end
   npm install
   cp .env.example .env
   # Edit .env with your actual credentials
   npm start
   ```

3. **Frontend Setup**
   ```bash
   cd Front-end
   npm install
   cp .env.example .env
   # Edit .env with your actual credentials
   npm start
   ```

## 🔑 Required Credentials

### Firebase (Required for Authentication)
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing
3. Enable Authentication > Sign-in method > Email/Password
4. Go to Project Settings > Service Accounts
5. Generate new private key and add credentials to `.env`

### Gemini AI (Required for Course Generation)
1. Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Add to `GEMINI_API_KEY` in backend `.env`

### Apple App Store (Optional - Production Only)
- Required only when publishing to App Store
- Add credentials when ready for production

### Google Play (Optional - Production Only)
- Required only when publishing to Play Store
- Add credentials when ready for production

## ⚠️ Security Notes

- **NEVER** commit `.env` files to Git
- Use `.env.example` templates for sharing
- Store credentials securely (password manager)
- The app works in development mode without store credentials

## 🚀 Features

- ✅ Firebase Authentication with subscription validation
- ✅ Course generation with Gemini AI (2 free courses for guests)
- ✅ In-app purchase integration (ready for production)
- ✅ Firestore database for user data and courses
- ✅ Graceful fallbacks when credentials missing
