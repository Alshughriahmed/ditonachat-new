"use client";
import Link from "next/link";

export default function Header() {
  return (
    <header className="bg-white shadow p-4">
      <div className="container mx-auto flex items-center justify-between">
        <Link href="/">
          <a className="text-2xl font-bold">DitoChat</a>
        </Link>
        <nav className="flex space-x-4">
          <Link href="/"><a className="hover:underline">Home</a></Link>
          <Link href="/upgrade"><a className="hover:underline">Upgrade</a></Link>
          <Link href="/register"><a className="hover:underline">Join Now</a></Link>
          <Link href="/login"><a className="hover:underline">Login</a></Link>
          <Link href="/account"><a className="hover:underline">My Account</a></Link>
        </nav>
      </div>
    </header>
  );
}
