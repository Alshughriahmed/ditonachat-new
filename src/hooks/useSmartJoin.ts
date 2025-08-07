// src/types/user.ts

/**
 * Defines the structure for a user object.
 * هذا النوع يمثل بيانات المستخدم الكاملة من قاعدة البيانات أو المصادقة.
 */
export interface User {
  id: string;
  name: string;
  email: string;
  gender?: Gender;
  country?: string;
  subscriptionStatus: 'FREE' | 'SUBSCRIBED' | 'BOOSTED';
}

/**
 * Defines the user's matching preferences.
 * هذا النوع يمثل تفضيلات المستخدم للمطابقة (مثل الجنس والبلد).
 */
export interface UserPreferences {
  gender: Gender;
  country: string;
}

/**
 * An enumeration for gender types, including all options required by the project.
 */
export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  LGBTQ = 'lgbtq',
  ANY = 'any',
}
