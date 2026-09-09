import admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

let adminApp: admin.app.App | null = null;
let initError: Error | null = null;

function tryParseCredential(raw: string): object | null {

  let cleaned = raw.trim();


  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === 'object' && (parsed as any).private_key) {
      return parsed;
    }
  } catch {}


  try {
    const onceParsed = JSON.parse(cleaned);
    if (typeof onceParsed === 'string') {
      const trimmed = onceParsed.trim();
      try {
        const twiceParsed = JSON.parse(trimmed);
        if (twiceParsed && typeof twiceParsed === 'object' && (twiceParsed as any).private_key) {
          return twiceParsed;
        }
      } catch {}

      if (onceParsed && typeof onceParsed === 'object' && (onceParsed as any).private_key) {
        return onceParsed;
      }
    }
  } catch {}


  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === 'object' && (parsed as any).private_key) {
      if (typeof (parsed as any).private_key === 'string' && (parsed as any).private_key.includes('\\n')) {
        (parsed as any).private_key = (parsed as any).private_key.replace(/\\n/g, '\n');
      }
      return parsed;
    }
  } catch {}


  try {
    let unescaped = cleaned;

    unescaped = unescaped.replace(/\\"/g, '"').replace(/\\\\n/g, '\\n');
    const parsed = JSON.parse(unescaped);
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
    throw initError;
  }

  try {

    const serviceAccountPath = path.join(process.cwd(), "server", "firebase-adminsdk.json");
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
      adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log("Firebase Admin initialized from file");
      return adminApp;
    }


    const envRaw = process.env.FIREBASE_ADMIN_SDK;


    if (envRaw) {
      console.log("FIREBASE_ADMIN_SDK env var found, length:", envRaw.length);
      console.log("FIREBASE_ADMIN_SDK starts with:", envRaw.substring(0, 50));

      const credential = tryParseCredential(envRaw);
      if (credential) {
        adminApp = admin.initializeApp({
          credential: admin.credential.cert(credential as any),
        });
        console.log("Firebase Admin initialized from environment variable");
        return adminApp;
      } else {
        console.error("FIREBASE_ADMIN_SDK: Failed to parse credential from all strategies");
        console.error("Raw value sample:", envRaw.substring(0, 100));
      }
    } else {
      console.error("FIREBASE_ADMIN_SDK env var is not set");
    }


    try {
      adminApp = admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
      console.log("Firebase Admin initialized from application default credentials");
      return adminApp;
    } catch (adcError) {
      console.log("Application default credentials not available:", adcError);
    }

    const error = new Error("Firebase Admin SDK credentials not found - check FIREBASE_ADMIN_SDK env var in Vercel");
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
