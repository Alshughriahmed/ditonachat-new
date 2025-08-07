'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import styles from './page.module.css';

export default function HomePage() {
  const router = useRouter();
  const [gender, setGender] = useState('');
  const [isAdult, setIsAdult] = useState(false);

  return (
    <main className={styles.hero}>
      <div className={styles.logo}>
        <Image src="/logo.png" alt="DitonaChat" width={95} height={95} />
      </div>

      <div className={styles.topRightCustom}>
        <span className={styles.ageTag}>+18</span>
        <select
          className={styles.langSelect}
          defaultValue="en"
          onChange={() => {}}
        >
          <option value="en">US English</option>
          <option value="ar">العربية</option>
          <option value="de">Deutsch</option>
          <option value="es">Español</option>
          <option value="fr">Français</option>
        </select>
      </div>

      <div className={styles.bgOverlay} />

      <div className={styles.card}>
        <h2 className={styles.subTag}>Ditona Video Chat</h2>
        <h1 className={styles.mainTag}>Chat & Flirt +18</h1>
        <div className={styles.form}>
          <select
            className={styles.genderSelect}
            value={gender}
            onChange={(e) => setGender(e.target.value)}
          >
            <option value="">Select your gender</option>
            <option value="male">♂ Male</option>
            <option value="female">♀ Female</option>
            <option value="paar">💑 Paar</option>
            <option value="lgbtq">🏳️‍🌈 LGBTQ+</option>
          </select>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              className={styles.checkbox}
              checked={isAdult}
              onChange={(e) => setIsAdult(e.target.checked)}
            />
            I confirm I am 18 or older
          </label>
          <button
            className={styles.startBtn}
            disabled={!gender || !isAdult}
            onClick={() => router.push(`/chat?type=${gender}`)}
          >
            START VIDEO CHAT
          </button>
        </div>
      </div>
    </main>
);
}
