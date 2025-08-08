import NextAuth from "next-auth";
import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // Add your authorization logic here
        return null; // Replace with actual logic
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET, // Required
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
