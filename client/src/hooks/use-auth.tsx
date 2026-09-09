import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { User as FirebaseUser, onAuthStateChanged, signOut as firebaseSignOut, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useLocation } from "wouter";
import { doc, getDoc, setDoc } from "firebase/firestore";

interface AuthContextType {
  user: (FirebaseUser & { role?: string }) | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
  signInWithGoogle: async () => {},
});

const googleProvider = new GoogleAuthProvider();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<(FirebaseUser & { role?: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();


  if (typeof window !== "undefined") {
    googleProvider.setCustomParameters({
      prompt: "select_account"
    });
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {

        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        const userData = userDoc.exists() ? userDoc.data() : {};

        setUser(Object.assign(currentUser, { role: userData.role || "user" }));
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);



  const signOut = async () => {
    await firebaseSignOut(auth);
    setLocation("/login");
  };

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);


      const userDoc = await getDoc(doc(db, "users", result.user.uid));


      if (!userDoc.exists()) {
        await setDoc(doc(db, "users", result.user.uid), {
          displayName: result.user.displayName || "",
          email: result.user.email,
          role: "user",
          createdAt: new Date().toISOString()
        });
      }

      setLocation("/");
    } catch (error) {
      console.error("Google Sign-In Error:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut, signInWithGoogle }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
