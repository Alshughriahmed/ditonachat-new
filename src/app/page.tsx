// src/app/page.tsx
"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

export default function Page() {
  const router = useRouter();
  const [gender, setGender] = useState<string>("");
  const [isAdult, setIsAdult] = useState(false);

  return (
    <main className={styles.container}>
      {/* ─── Top Overlay Bar ─────────────────────────────────────────────────── */}
      <div className={styles.topOverlay}>
        <div className={styles.logo}>
          <Image src="/logo.png" alt="DitonaChat" width={50} height={50} />
        </div>
        <div className={styles.overlayRight}>
          <span className={styles.ageTag}>+18</span>
          <select
            className={styles.langSelect}
            defaultValue="en"
            onChange={(e) => console.log("switch to", e.target.value)}
          >
            <option value="en">🇺🇸 English</option>
            <option value="ar">🇸🇦 العربية</option>
            <option value="de">🇩🇪 Deutsch</option>
            <option value="es">🇪🇸 Español</option>
            <option value="fr">🇫🇷 Français</option>
          </select>
        </div>
      </div>
      {/* ─────────────────────────────────────────────────────────────────────── */}

      {/* Background image */}
      <div className={styles.background} />

      {/* Central form box */}
      <div className={styles.formBox}>
        <h1 className={styles.title}>Welcome to DitonaChat</h1>
        <p className={styles.subtitle}>Unleash the excitement<br/>Let your wild side shine</p>
        <h2 className={styles.mainTag}>Chat &amp; Flirt +18</h2>

        <div className={styles.controls}>
          <select
            className={styles.select}
            value={gender}
            onChange={(e) => setGender(e.target.value)}
          >
            <option value="">Select your gender</option>
            <option value="male">♂ Male</option>
            <option value="female">♀ Female</option>
            <option value="paar">⚭ Paar</option>
            <option value="lgbtq">🏳️‍🌈 LGBTQ+</option>
          </select>

          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={isAdult}
              onChange={(e) => setIsAdult(e.target.checked)}
            />
            I confirm I am 18 or older
          </label>

          <button
            className={styles.startBtn}
            disabled={!gender || !isAdult}
            onClick={() => {
              router.push(`/chat?type=${gender}`);
            }}
          >
            START VIDEO CHAT
          </button>
        </div>

        <p className={styles.legal}>
          By using this site, you agree to our{" "}
          <a href="/terms">Terms of Use</a> and{" "}
          <a href="/privacy">Privacy Policy</a>.
        </p>
      </div>
    </main>
  );
}
