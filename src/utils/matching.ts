// File: src/utils/matching.ts

export type Gender = 'male' | 'female' | 'couple' | 'gay' | 'other';

export interface User {
  isVip: boolean;
  isBoosted: boolean;
  gender: Gender[];
  countries: string[];
  currentCountry: string;
}

/**
 * Determines if two users are a full match based on their type (VIP/Boosted/Free).
 */
export const matchUsers = (userA: User, userB: User): boolean => {
  // Prioritize VIP matching
  if ((userA.isVip || userA.isBoosted) && (userB.isVip || userB.isBoosted)) {
    return advancedMatch(userA, userB);
  }

  // Fallback to standard match
  return standardMatch(userA, userB);
};

/**
 * VIP or Boosted users have access to full matching flexibility.
 * Match by any overlapping gender AND preferred country (or current country).
 */
const advancedMatch = (userA: User, userB: User): boolean => {
  const genderMatch = userA.gender.some(g => userB.gender.includes(g));
  const countryMatch =
    userA.countries.includes(userB.currentCountry) ||
    userB.countries.includes(userA.currentCountry);

  return genderMatch && countryMatch;
};

/**
 * Standard users must match by country first, and gender is not considered directly.
 */
const standardMatch = (userA: User, userB: User): boolean => {
  const sameCountry =
    userA.currentCountry === userB.currentCountry ||
    userA.countries.includes(userB.currentCountry) ||
    userB.countries.includes(userA.currentCountry);

  return sameCountry;
};

/**
 * Optional fallback logic for relaxed matching (optional use).
 */
export const fallbackMatch = (userA: User, userB: User): boolean => {
  const genderMatch = userA.gender.some(g => userB.gender.includes(g));
  const countryMatch =
    userA.countries.includes(userB.currentCountry) ||
    userB.countries.includes(userA.currentCountry);

  return genderMatch || countryMatch;
};
