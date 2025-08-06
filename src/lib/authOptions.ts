import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
    // يمكنك إضافة مزودين آخرين هنا مثل GitHub, Facebook, إلخ.
  ],
  // يمكن إضافة إعدادات أخرى مثل pages, callbacks, ...
};
