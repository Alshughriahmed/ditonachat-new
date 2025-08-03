"use client";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";

export default function Header() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const roomTypes = [
    { key: 'random', label: 'Random Video Chat' },
    { key: 'girls', label: 'Chat with Girls' },
    { key: 'cam-to-cam', label: 'Cam to Cam' },
    { key: 'dirty', label: 'Dirty Chat' },
    { key: 'anonymous', label: 'Anonymous Chat' },
    { key: 'lgbtq', label: 'LGBTQ+ Chat' },
    { key: 'text', label: 'Text Chat Only' }
  ];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const isRoomPage = pathname?.startsWith('/rooms/');

  return (
    <header className="bg-white shadow p-4">
      <div className="container mx-auto flex items-center justify-between">
        {/* شعار الموقع */}
        <Link href="/" className="text-2xl font-bold">
          DitoChat
        </Link>

        {/* قائمة التنقل */}
        <nav className="flex space-x-4 items-center">
          <Link href="/" className="hover:underline">
            Home
          </Link>
          
          {/* Chat Rooms Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`hover:underline flex items-center ${isRoomPage ? 'font-semibold text-blue-600' : ''}`}
            >
              Chat Rooms
              <svg 
                className={`ml-1 h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {isDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                <div className="py-1">
                  {roomTypes.map((room) => (
                    <Link
                      key={room.key}
                      href={`/rooms/${room.key}`}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      {room.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

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
