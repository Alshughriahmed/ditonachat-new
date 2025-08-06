// src/utils/matching.ts

import { Gender } from '@/types/Gender';

// واجهة لتفضيلات المستخدم للمطابقة
export interface UserPreferences {
  gender: Gender;
  country?: string;
}

// دالة مطابقة المستخدمين
export function matchUsers(user1: UserPreferences, user2: UserPreferences): boolean {
  // إذا كان أي من المستخدمين لديه gender = ANY، فإن المطابقة تكون ناجحة
  if (user1.gender === Gender.ANY || user2.gender === Gender.ANY) {
    return true;
  }

  // إذا لم يكن أي منهما ANY، تحقق من تطابق الجنس
  return user1.gender === user2.gender;
}
