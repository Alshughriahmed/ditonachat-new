// src/hooks/useUserPreferences.ts
import { useEffect, useState } from "react";

export function useUserPreferences() {
  const [genderPref, setGenderPref] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/preferences/gender")
      .then(res => res.json())
      .then(data => {
        if (data?.genderPref) setGenderPref(data.genderPref);
      })
      .catch(() => {});
  }, []);

  return { genderPref, setGenderPref };
}
