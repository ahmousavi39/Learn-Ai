# LearnAI - Subscription-Based Learning App

A comprehensive React Native (Expo) application with subscription-based authentication using Firebase Auth and in-app purchases.

## 🏗️ Architecture

```
[Expo App] -> [Express API] -> [Apple/Google APIs]
                         -> [Firebase Admin SDK]
```

## 🔧 Tech Stack

- **Frontend**: Expo (React Native)
- **Authentication**: Firebase Authentication
- **Backend**: Express.js (Node.js)
- **Database**: Firestore
- **Payments**: 
  - iOS: Apple In-App Purchases (StoreKit)
  - Android: Google Play Billing
  - Unified handling: expo-in-app-purchases

## 📁 Project Structure

```
LearnAi/
├── Front-end/
│   ├── services/
│   │   ├── firebaseConfig.ts       # Firebase configuration
│   │   ├── authService.ts          # Authentication service
│   │   └── subscriptionService.ts  # In-app purchase service
│   ├── contexts/
│   │   └── AuthContext.tsx         # Authentication context
│   ├── app/components/
│   │   ├── login.tsx               # Login/Signup component
│   │   ├── subscriptionScreen.tsx  # Subscription screen
│   │   └── authGuard.tsx           # Route protection
│   └── .env                        # Environment variables
├── Back-end/
│   ├── config/
│   │   └── firebase.js             # Firebase Admin SDK config
│   ├── routes/
│   │   ├── auth.js                 # Authentication routes
│   │   └── subscriptions.js        # Subscription routes
│   ├── services/
│   │   └── receiptVerification.js  # Receipt verification
│   ├── server.js                   # Main server file
│   └── .env                        # Environment variables
```

## 🚀 Setup Instructions

### 1. Firebase Setup

1. Create a Firebase project at https://firebase.google.com/
2. Enable Authentication with Email/Password
3. Enable Firestore Database
4. Generate a Firebase Admin SDK private key
5. Get your Firebase web app configuration

### 2. Apple App Store Setup (iOS)

1. Enroll in Apple Developer Program
2. Create your app in App Store Connect
3. Set up in-app purchase products:
   - Monthly subscription: `learn_ai_monthly`
   - Yearly subscription: `learn_ai_yearly`
4. Generate App Store Connect API key
5. Get your bundle ID and other credentials

### 3. Google Play Setup (Android)

1. Create Google Play Developer account
2. Create your app in Google Play Console
3. Set up subscription products:
   - Monthly subscription: `learn_ai_monthly_android`
   - Yearly subscription: `learn_ai_yearly_android`
4. Create service account for Google Play API
5. Enable Google Play Developer API

### 4. Environment Configuration

#### Frontend (.env)
```env
LOCAL_HTTP_SERVER=http://localhost:3000
EXPO_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
```

#### Backend (.env)
```env
# Server
PORT=3000
NODE_ENV=development

# Firebase Admin
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com

# Apple App Store
APPLE_ISSUER_ID=your-issuer-id
APPLE_KEY_ID=your-key-id
APPLE_BUNDLE_ID=com.yourcompany.learnai
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
APPLE_SHARED_SECRET=your-shared-secret

# Google Play
GOOGLE_PLAY_PACKAGE_NAME=com.yourcompany.learnai
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# Gemini AI (existing)
GEMINI_API_KEY=your-gemini-api-key
```

### 5. Installation

#### Backend
```bash
cd Back-end
npm install
npm start
```

#### Frontend
```bash
cd Front-end
npm install
npx expo start
```

## 🔐 Authentication Flow

### Subscription Flow (New Users)
1. User opens app → sees subscription screen
2. User chooses monthly/yearly plan
3. `expo-in-app-purchases` handles purchase
4. App sends receipt to backend for verification
5. Backend verifies with Apple/Google APIs
6. If valid, user can create account
7. Firebase Auth creates user account
8. User is signed in and can access app

### Login Flow (Existing Users)
1. User enters email/password
2. Firebase Auth validates credentials
3. App checks subscription status with backend
4. If subscription valid → user accesses app
5. If subscription expired → redirect to subscription screen

## 📱 Key Components

### SubscriptionScreen
- Displays available subscription plans
- Handles in-app purchases
- Communicates with backend for verification
- Manages purchase restoration

### LoginScreen  
- Multi-mode component (login/signup/forgot password)
- Integrated with subscription flow
- Form validation and error handling
- Responsive design

### AuthGuard
- Protects routes requiring authentication
- Shows loading states
- Redirects to login when needed

### AuthContext
- Manages global authentication state
- Provides auth methods to components
- Handles automatic subscription validation

## 🛡️ Security Features

- Firebase Admin SDK for server-side user management
- Receipt verification with Apple/Google APIs
- JWT token validation for API requests
- Subscription status validation on each app launch
- Automatic logout on subscription expiry

## 🔧 Backend API Endpoints

### Authentication (`/api/auth`)
- `POST /check-subscription` - Check user subscription status
- `POST /create-profile` - Create user profile
- `GET /profile` - Get user profile
- `PUT /profile` - Update user profile
- `DELETE /account` - Delete user account

### Subscriptions (`/api/subscriptions`)
- `POST /verify` - Verify purchase receipt
- `POST /link-to-user` - Link subscription to user
- `POST /status` - Check subscription status
- `GET /history/:uid` - Get subscription history
- `PUT /update-status` - Update subscription status

## 🧪 Testing

1. Use sandbox environments for testing:
   - Apple: TestFlight or Simulator
   - Google: Internal testing track
2. Test subscription flows thoroughly
3. Verify receipt validation works correctly
4. Test edge cases (network failures, invalid receipts)

## 📚 Additional Resources

- [Expo In-App Purchases Documentation](https://docs.expo.dev/versions/latest/sdk/in-app-purchases/)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [Apple App Store Server API](https://developer.apple.com/documentation/appstoreserverapi)
- [Google Play Billing](https://developer.android.com/google/play/billing)

## 🤝 Support

For issues and questions:
1. Check the documentation
2. Review error logs
3. Test in sandbox environments first
4. Verify all credentials are correctly configured

## 📝 License

This project is licensed under the MIT License.
