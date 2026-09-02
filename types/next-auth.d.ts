import type { DefaultSession, DefaultUser } from "next-auth";
import type { Role } from "@/lib/types";

declare module "next-auth" {
  interface User extends DefaultUser {
    role: Role;
    orgOwnerId: string;
    clientId: string | null;
    employeeId: string | null;
    /** Set only while a platform_admin is viewing this account's workspace. */
    impersonatorId?: string;
    impersonatorName?: string;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      orgOwnerId: string;
      clientId: string | null;
      employeeId: string | null;
      impersonatorId?: string | null;
      impersonatorName?: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
    orgOwnerId?: string;
    clientId?: string | null;
    employeeId?: string | null;
    impersonatorId?: string;
    impersonatorName?: string;
  }
}
