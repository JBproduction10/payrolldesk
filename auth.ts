import NextAuth, { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { findUserByEmail } from "@/lib/db/users";

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
  ],

  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.orgOwnerId = user.orgOwnerId;
        token.clientId = user.clientId;
        token.employeeId = user.employeeId;
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
      }

      return session;
    },
  },
};

/** Server-side session helper for Next.js App Router. */
export const auth = () => getServerSession(authOptions);

export default auth;