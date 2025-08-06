// src/hooks/useSmartJoin.ts

import { useEffect, useState } from "react";
import { useUser } from "@/context/UserContext";
import { Gender } from "@/types/Gender";
import { matchUsers, UserPreferences } from "@/utils/matching";

// 🧠 خطاف الانضمام الذكي للطابور
export const useSmartJoin = () => {
  const { user } = useUser();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);

  // ⚙️ تحديد التفضيلات بناءً على حالة المستخدم
  useEffect(() => {
    // لا تفعل شيئاً إذا لم يتم تحميل بيانات المستخدم بعد
    if (!user) {
      setPreferences(null);
      return;
    }

    // تحقق مما إذا كان المستخدم مشتركاً
    const isSubscriber = user.subscriptionStatus !== "FREE";

    // تحديد التفضيلات بناءً على حالة الاشتراك
    const computedPreferences: UserPreferences = {
      gender: isSubscriber ? user.gender : Gender.ANY, // المشترك يختار الجنس، الزائر يتطابق مع أي جنس
      country: isSubscriber ? user.country : user.country, // المشترك يختار الدولة، الزائر يطابق في دولته فقط
    };

    setPreferences(computedPreferences);
  }, [user]);

  // 🚀 دالة الانضمام إلى طابور المطابقة
  // في هذه المرحلة، هذه الدالة ستقوم بمحاكاة المطابقة.
  // لاحقاً، سيتم استبدالها باستدعاء API.
  const joinQueue = (potentialPartner: UserPreferences): boolean => {
    if (!preferences) {
      console.warn("User preferences not available yet.");
      return false;
    }

    // استخدام دالة المطابقة التي أنشأناها
    const matched = matchUsers(preferences, potentialPartner);
    console.log("Matching result:", matched);
    return matched;
  };

  return {
    preferences,
    joinQueue,
  };
};
