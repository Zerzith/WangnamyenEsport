import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";



const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export function mapFirebaseErrorToThaiMessage(errorCode: string): string {
  switch (errorCode) {
    case 'auth/user-not-found':
      return 'ไม่พบผู้ใช้นี้ในระบบ';
    case 'auth/wrong-password':
      return 'รหัสผ่านไม่ถูกต้อง';
    case 'auth/email-already-in-use':
      return 'อีเมลนี้ถูกใช้งานแล้ว';
    case 'auth/weak-password':
      return 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร';
    case 'auth/invalid-email':
      return 'รูปแบบอีเมลไม่ถูกต้อง';
    case 'auth/network-request-failed':
      return 'การเชื่อมต่ออินเทอร์เน็ตมีปัญหา';
    default:
      return 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
  }
}
