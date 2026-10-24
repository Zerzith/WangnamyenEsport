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
      return 'อีเมลนี้มีบัญชีอยู่แล้ว กรุณาเข้าสู่ระบบหรือใช้อีเมลอื่น';
    case 'auth/weak-password':
      return 'รหัสผ่านต้องมีอย่างน้อย 8 ตัว พร้อมตัวเลขและภาษาอังกฤษพิมพ์เล็กและพิมพ์ใหญ่';
    case 'auth/invalid-email':
      return 'รูปแบบอีเมลไม่ถูกต้อง';
    case 'auth/operation-not-allowed':
      return 'ระบบยังไม่ได้เปิดใช้การสมัครด้วยอีเมลและรหัสผ่าน กรุณาให้ผู้ดูแลเปิด Email/Password ใน Firebase Authentication';
    case 'auth/unauthorized-domain':
    case 'auth/app-not-authorized':
      return 'โดเมนเว็บไซต์นี้ยังไม่ได้รับอนุญาตใน Firebase Authentication';
    case 'auth/invalid-api-key':
    case 'auth/requests-from-referer-blocked':
      return 'การตั้งค่า Firebase API key ไม่ถูกต้องหรือยังไม่อนุญาตโดเมนเว็บไซต์นี้';
    case 'auth/too-many-requests':
      return 'มีการลองสมัครหรือเข้าสู่ระบบหลายครั้ง กรุณารอสักครู่แล้วลองใหม่';
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
    case 'auth/network-request-failed':
      return 'การเชื่อมต่ออินเทอร์เน็ตมีปัญหา';
    default:
      return 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
  }
}
