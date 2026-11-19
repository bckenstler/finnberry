import NextAuth, { type NextAuthConfig } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Nodemailer from "next-auth/providers/nodemailer";
import { prisma, type UserStatus } from "@finnberry/db";
import { claimInstanceAdmin } from "./instance-admin";
import { MAGIC_LINK_MAX_AGE_SECONDS, mayRequestMagicLink } from "./magic-link-throttle";

// Columns of the users table that the Auth.js adapter user type does not list.
interface AccountAccess {
  status: UserStatus;
  isAdmin: boolean;
}

const providers: NextAuthConfig["providers"] = [];

// Only add Nodemailer if email server is configured
if (process.env.EMAIL_SERVER) {
  providers.push(
    Nodemailer({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM,
      maxAge: MAGIC_LINK_MAX_AGE_SECONDS,
    })
  );
}

// Only add Google OAuth if credentials are configured
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.unshift(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers,
  pages: {
    signIn: "/login",
    error: "/auth/error",
    verifyRequest: "/auth/verify-request",
  },
  callbacks: {
    // Invites and the ADMIN_EMAIL pin both trust the account's email address,
    // so an address Google has not verified cannot sign in. A magic link
    // proves the address by being received.
    signIn: async ({ user, account, profile, email }) => {
      // This callback also runs when a magic link is requested, before any
      // mail is sent. That is the point to refuse a flood of requests.
      if (email?.verificationRequest) {
        const mayRequest = !!user.email && (await mayRequestMagicLink(user.email));
        return mayRequest || "/auth/error?error=TooManyRequests";
      }
      return account?.provider !== "google" || profile?.email_verified === true;
    },
    // With database sessions `user` is the row read for this request, so a
    // change of status or admin takes effect on the next request.
    session: ({ session, user }) => {
      const account = user as typeof user & Partial<AccountAccess>;
      return {
        ...session,
        user: {
          ...session.user,
          id: user.id,
          status: account.status ?? "PENDING",
          isAdmin: account.isAdmin === true,
        },
      };
    },
  },
  events: {
    // Auth.js logs and swallows an error thrown here. That leaves the account
    // PENDING, and the claim is attempted again on its next sign-in.
    signIn: async ({ user }) => {
      if (user.id) {
        await claimInstanceAdmin({ id: user.id, email: user.email });
      }
    },
  },
  session: {
    strategy: "database",
  },
  // The Host header is trusted only when the deployment says what its URL is.
  // Auth.js reads AUTH_URL, AUTH_TRUST_HOST and VERCEL itself when this is
  // undefined, and trusts the host in development. An explicit false would
  // override all of those and reject every request.
  trustHost: process.env.NEXTAUTH_URL ? true : undefined,
});

export type Session = Awaited<ReturnType<typeof auth>>;
