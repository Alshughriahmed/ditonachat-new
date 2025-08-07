'use client';

import { signIn } from 'next-auth/react';

export default function SignInPage() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="bg-white p-10 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Welcome to Ditonachat</h1>
        <button
          onClick={() => signIn('google')}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
