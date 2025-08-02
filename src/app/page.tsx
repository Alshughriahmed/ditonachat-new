// ditonachat-new/src/app/page.tsx

import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gray-50">
      <div className="text-center">
        <h1 className="text-3xl mb-6 font-bold">Welcome to DitonaChat</h1>
        <Link
          href="/chat"
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Go to Chat
        </Link>
      </div>
    </div>
  );
}
