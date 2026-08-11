import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";
let adminApp: admin.app.App | null = null;
export function initializeFirebaseAdmin() {
  if (adminApp) {
    return adminApp;
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
    } else if (process.env.FIREBASE_ADMIN_SDK) {
      // Try to load from environment variable (for Vercel/production)
      let serviceAccountStr = process.env.FIREBASE_ADMIN_SDK;
      // Handle case where the JSON might be stringified twice (common in Vercel)
      try {
        let serviceAccount = JSON.parse(serviceAccountStr);
        adminApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        console.log("Firebase Admin initialized from environment variable");
      } catch (parseError) {
        // If it's already a string (double-encoded), try parsing once more
        try {
          const doubleParsed = JSON.parse(JSON.parse(serviceAccountStr));
          adminApp = admin.initializeApp({
            credential: admin.credential.cert(doubleParsed),
          });
          console.log("Firebase Admin initialized from double-encoded environment variable");
        } catch (doubleParseError) {
          console.error("Failed to parse FIREBASE_ADMIN_SDK:", doubleParseError);
          throw doubleParseError;
        }
      }
    } else {
      throw new Error("Firebase Admin SDK credentials not found");
    }
    return adminApp;
  } catch (error) {
    console.error("Failed to initialize Firebase Admin:", error);
    throw error;
  }
}
export function getFirebaseAdmin() {
  if (!adminApp) {
    initializeFirebaseAdmin();
  }
  return adminApp!;
}
export const db = () => admin.firestore();
export const auth = () => admin.auth();
