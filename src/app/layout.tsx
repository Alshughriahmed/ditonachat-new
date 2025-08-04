// src/app/layout.tsx
import './globals.css'
import styles from './page.module.css'
import Link from 'next/link'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* ——— Header ——— */}
        <header className={styles.topBar}>
          <div className={styles.logo}>
            <Link href="/">
              <img src="/logo.png" alt="DitonaChat" />
            </Link>
          </div>
          <nav className={styles.topRight}>
            {/* تنقل رئيسي */}
            <Link href="/" className={styles.navBtn}>Home</Link>
            <Link href="/upgrade" className={styles.navBtn}>Upgrade</Link>
            <Link href="/register" className={styles.navBtn}>Join Now</Link>
            <Link href="/login" className={styles.navBtn}>Login</Link>
            <Link href="/account" className={styles.navBtn}>My Account</Link>
            {/* وسم الـ +18 */}
            <span className={styles.ageTag}>+18</span>
            {/* اختيار اللغة */}
            <select className={styles.langSelect} defaultValue="en">
              <option value="en">EN</option>
              <option value="ar">AR</option>
              <option value="de">DE</option>
              <option value="es">ES</option>
              <option value="fr">FR</option>
            </select>
          </nav>
        </header>

        {/* ——— المحتوى الرئيسي ——— */}
        <main>
          {children}
        </main>

        {/* ——— Footer ——— */}
        <footer className={styles.footer}>
          <nav className={styles.footerNav}>
            <Link href="/" className={styles.navBtn}>Home</Link>
            <Link href="/terms" className={styles.navBtn}>Terms</Link>
            <Link href="/privacy" className={styles.navBtn}>Privacy</Link>
            <Link href="/2257" className={styles.navBtn}>2257</Link>
            <Link href="/abuse" className={styles.navBtn}>Abuse</Link>
            <Link href="/billing-support" className={styles.navBtn}>Billing Support</Link>
            <Link href="/copyright" className={styles.navBtn}>Copyright</Link>
            <Link href="/contact" className={styles.navBtn}>Contact Us</Link>
          </nav>
        </footer>
      </body>
    </html>
  )
}
