// src/context/UserContext.tsx

"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { Gender } from "@/types/Gender";

// واجهة User لتحديد خصائص المستخدم
interface User {
  id: string;
  name: string;
  gender: Gender;
  lookingFor?: string;
  isVip: boolean;
  isBoosted: boolean;
  boostActive?: boolean;
  email?: string;
  displayName?: string;
  profileMessage?: string;
  country?: string;
  subscriptionStatus: "FREE" | "BOOST" | "WEEKLY" | "YEARLY";
  subscriptionExpiresAt?: string | Date;
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    snapchat?: string;
  };
}

// واجهة للسياق
interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
}

// إنشاء السياق
const UserContext = createContext<UserContextType | undefined>(undefined);

// مزود السياق
export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // useEffect لتحميل حالة المستخدم من الذاكرة المحلية عند بداية التطبيق
  useEffect(() => {
    // هذه الخطوة اختيارية، لكنها مفيدة لمزامنة المستخدم
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse user data from localStorage", e);
      }
    }
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
}

// خطاف للوصول إلى السياق
export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
