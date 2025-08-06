import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Gender = string[];
type Country = string[];

interface UserPreferences {
  isVip: boolean;
  isBoosted: boolean;
  gender: Gender;
  countries: Country;
  boostExpiry?: number;
}

interface UserContextType {
  userPreferences: UserPreferences;
  setUserPreferences: (preferences: Partial<UserPreferences>) => void;
  checkBoostExpiry: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const getInitialPreferences = (): UserPreferences => {
  if (typeof window !== 'undefined') {
    const storedPreferences = localStorage.getItem('userPreferences');
    if (storedPreferences) {
      return JSON.parse(storedPreferences);
    }
  }
  return {
    isVip: false,
    isBoosted: false,
    gender: [],
    countries: [],
  };
};

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userPreferences, setUserPreferencesState] = useState<UserPreferences>(getInitialPreferences);

  const checkBoostExpiry = () => {
    setUserPreferencesState(prevPreferences => {
      if (prevPreferences.isBoosted && prevPreferences.boostExpiry) {
        if (Date.now() > prevPreferences.boostExpiry) {
          return { ...prevPreferences, isBoosted: false, boostExpiry: undefined };
        }
      }
      return prevPreferences;
    });
  };

  const setUserPreferences = (preferences: Partial<UserPreferences>) => {
    setUserPreferencesState(prevPreferences => {
      const newPreferences = { ...prevPreferences, ...preferences };

      if (preferences.isBoosted && !prevPreferences.isBoosted) {
        newPreferences.boostExpiry = Date.now() + 60 * 60 * 1000; // 60 دقيقة
      }

      return newPreferences;
    });
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('userPreferences', JSON.stringify(userPreferences));
    }

    const intervalId = setInterval(checkBoostExpiry, 60 * 1000);

    return () => clearInterval(intervalId);
  }, [userPreferences]);

  const value = {
    userPreferences,
    setUserPreferences,
    checkBoostExpiry,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
