// src/types/user.ts

/**
 * Defines the structure for a user object.
 */
export interface User {
  id: string;
  name: string;
  email: string;
  gender?: Gender;
  country?: string;
  // أضف أي خصائص أخرى للمستخدم هنا.
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
