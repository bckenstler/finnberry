import type { DefaultSession } from "next-auth";
import type { UserStatus } from "@finnberry/db";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      status: UserStatus;
      isAdmin: boolean;
    } & DefaultSession["user"];
  }
}
