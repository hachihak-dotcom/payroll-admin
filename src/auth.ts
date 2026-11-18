import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verifyCredentials } from "@/lib/accounts";

declare module "next-auth" {
  interface User { sessionVersion?: number }
  interface Session { account?: { id: string; version: number } }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  providers: [Credentials({ credentials: { email: {}, password: {} }, authorize: (input, request) => verifyCredentials(input, request.headers) })],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.version = user.sessionVersion;
      return token;
    },
    session({ session, token }) {
      if (token.sub && typeof token.version === "number") session.account = { id: token.sub, version: token.version };
      return session;
    },
  },
});
