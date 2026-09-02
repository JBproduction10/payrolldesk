import NextAuth, { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { findUserByEmail, findUserById } from "@/lib/db/users";
import { getOrganizationByOwnerId } from "@/lib/db/organizations";
import { verifyImpersonationToken } from "@/lib/impersonation-token";

export const authOptions = {
  session: {
    strategy: "jwt" as const,
  },

  pages: {
    signIn: "/login",
  },

  providers: [
    CredentialsProvider({
      name: "Email and password",

      credentials: {
        email: {
          label: "Email",
          type: "email",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },

      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;

        if (
          typeof email !== "string" ||
          typeof password !== "string"
        ) {
          return null;
        }

        let user;

        try {
          user = await findUserByEmail(email);
        } catch (err) {
          console.error(
            "Auth lookup failed — is MONGODB_URI configured?",
            err
          );

          throw new Error(
            "Couldn't reach the database. Please try again shortly."
          );
        }

        if (!user) {
          return null;
        }

        if (!user.passwordHash) {
          return null;
        }

        const valid = await bcrypt.compare(
          password,
          user.passwordHash
        );

        if (!valid) {
          return null;
        }

        // Block sign-in for anyone under a suspended promoter organization.
        // platform_admin accounts aren't scoped to an Organization, so skip
        // this check for them.
        if (user.role !== "platform_admin") {
          try {
            const org = await getOrganizationByOwnerId(user.orgOwnerId);
            if (org && org.status === "suspended") {
              throw new Error("This organization has been suspended.");
            }
          } catch (err) {
            if (err instanceof Error && err.message.includes("suspended")) {
              throw err;
            }
            // Organization lookup failing shouldn't block sign-in for
            // promoters whose Organization record doesn't exist yet
            // (e.g. pre-migration accounts) — fail open, not closed.
            console.error("Organization status check failed:", err);
          }
        }

        return {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          orgOwnerId: user.orgOwnerId,
          clientId: user.clientId,
          employeeId: user.employeeId,
        };
      },
    }),

    // Hands off a session between a platform_admin and a promoter's
    // super_admin (and back) using a short-lived signed token instead of a
    // password — see lib/impersonation-token.ts. Only ever invoked
    // programmatically by our own "switch promoter" / "exit" UI, never
    // shown as a sign-in option.
    CredentialsProvider({
      id: "impersonate",
      name: "Switch workspace",
      credentials: {
        token: { label: "Token", type: "text" },
      },

      async authorize(credentials) {
        const token = credentials?.token;
        if (typeof token !== "string") return null;

        const payload = verifyImpersonationToken(token);
        if (!payload) return null;

        let target;
        try {
          target = await findUserById(payload.targetUserId);
        } catch (err) {
          console.error("Impersonation lookup failed:", err);
          throw new Error("Couldn't reach the database. Please try again shortly.");
        }
        if (!target) return null;

        if (payload.impersonatorId) {
          // Entering impersonation: only a real platform_admin can hand off
          // to a promoter's super_admin, and only into an active org.
          const impersonator = await findUserById(payload.impersonatorId);
          if (!impersonator || impersonator.role !== "platform_admin") return null;
          if (target.role !== "super_admin") return null;

          const org = await getOrganizationByOwnerId(target._id);
          if (org && org.status === "suspended") return null;
        } else {
          // Exiting back to the platform admin's own account.
          if (target.role !== "platform_admin") return null;
        }

        return {
          id: target._id,
          name: target.name,
          email: target.email,
          role: target.role,
          orgOwnerId: target.orgOwnerId,
          clientId: target.clientId,
          employeeId: target.employeeId,
          impersonatorId: payload.impersonatorId,
          impersonatorName: payload.impersonatorName,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.orgOwnerId = user.orgOwnerId;
        token.clientId = user.clientId;
        token.employeeId = user.employeeId;
        // Only set on sign-in (never carried over implicitly) so exiting
        // impersonation — a fresh sign-in with no impersonatorId — clears it.
        token.impersonatorId = user.impersonatorId;
        token.impersonatorName = user.impersonatorName;
      }

      return token;
    },

    async session({ session, token }: any) {
      if (session.user && token.id) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.orgOwnerId = token.orgOwnerId;
        session.user.clientId = token.clientId ?? null;
        session.user.employeeId = token.employeeId ?? null;
        session.user.impersonatorId = token.impersonatorId ?? null;
        session.user.impersonatorName = token.impersonatorName ?? null;
      }

      return session;
    },
  },
};

/** Server-side session helper for Next.js App Router. */
export const auth = () => getServerSession(authOptions);

export default auth;