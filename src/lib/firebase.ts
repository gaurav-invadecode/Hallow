// Firebase is kept only for Authentication
// All database operations now go through MongoDB via API routes
// All file storage operations now go through Azure Blob Storage via API routes

import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

// Firebase configuration (kept for Auth only)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase (Auth only)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
