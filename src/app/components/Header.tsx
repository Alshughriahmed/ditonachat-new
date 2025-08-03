"use client";
import Link from "next/link";

export default function Header() {
  return (
    <header className="bg-white shadow p-4">
      <div className="container mx-auto flex items-center justify-between">
        {/* شعار الموقع */}
        <Link href="/" className="text-2xl font-bold">
          DitoChat
        </Link>

        {/* قائمة التنقل */}
        <nav className="flex space-x-4">
          <Link href="/" className="hover:underline">
            Home
          </Link>
          <Link href="/upgrade" className="hover:underline">
            Upgrade
          </Link>
          <Link href="/register" className="hover:underline">
            Join Now
          </Link>
          <Link href="/login" className="hover:underline">
            Login
          </Link>
          <Link href="/account" className="hover:underline">
            My Account
          </Link>
        </nav>
      </div>
    </header>
  );
}
