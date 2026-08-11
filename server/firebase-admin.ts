import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

let adminApp: admin.app.App | null = null;
let initError: Error | null = null;

function tryParseCredential(raw: string): object | null {
  // Strategy 1: Direct parse (if it's already valid JSON)
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && (parsed as any).private_key) {
      return parsed;
    }
  } catch {}

  // Strategy 2: If raw looks like it's a JSON string (double-encoded)
  try {
    const onceParsed = JSON.parse(raw);
    if (typeof onceParsed === 'string') {
      try {
        const twiceParsed = JSON.parse(onceParsed);
        if (twiceParsed && typeof twiceParsed === 'object' && (twiceParsed as any).private_key) {
          return twiceParsed;
        }
      } catch {}
      // Maybe it was already a proper object after one parse
      if (onceParsed && typeof onceParsed === 'object' && (onceParsed as any).private_key) {
        return onceParsed;
      }
    }
  } catch {}

  // Strategy 3: Handle escaped newlines in private_key
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && (parsed as any).private_key) {
      if (typeof (parsed as any).private_key === 'string' && (parsed as any).private_key.includes('\\n')) {
        (parsed as any).private_key = (parsed as any).private_key.replace(/\\n/g, '\n');
      }
      return parsed;
    }
  } catch {}

  return null;
}

export function initializeFirebaseAdmin() {
  if (adminApp) {
    return adminApp;
  }

  if (initError) {
    // Don't retry if we already failed once (avoid spam)
    throw initError;
  }

  try {
    // Try to load from file first (for local development)
    const serviceAccountPath = path.join(process.cwd(), "server", "firebase-adminsdk.json");
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
      adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log("Firebase Admin initialized from file");
      return adminApp;
    }

    // Try environment variable (for Vercel/production)
    const envRaw = process.env.FIREBASE_ADMIN_SDK;
    if (envRaw) {
      const credential = tryParseCredential(envRaw);
      if (credential) {
        adminApp = admin.initializeApp({
          credential: admin.credential.cert(credential as any),
        });
        console.log("Firebase Admin initialized from environment variable");
        return adminApp;
      }
    }

    // Fallback: Try default credentials (if running on GCP or with ADC)
    try {
      adminApp = admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
      console.log("Firebase Admin initialized from application default credentials");
      return adminApp;
    } catch (adcError) {
      console.log("Application default credentials not available:", adcError);
    }

    const error = new Error("Firebase Admin SDK credentials not found");
    initError = error;
    throw error;
  } catch (error: any) {
    console.error("Failed to initialize Firebase Admin:", error);
    initError = error;
    throw error;
  }
}

export function getFirebaseAdmin() {
  if (!adminApp) {
    initializeFirebaseAdmin();
  }
  return adminApp!;
}

export function db() {
  const app = getFirebaseAdmin();
  return app.firestore();
}

export function auth() {
  const app = getFirebaseAdmin();
  return app.auth();
}
