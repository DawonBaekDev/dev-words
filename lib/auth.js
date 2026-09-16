import "server-only";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";
import { admin as adminPlugin } from "better-auth/plugins";
import { getDatabase } from "@/lib/db/mongodb";

const betterAuthSecret = process.env.BETTER_AUTH_SECRET;

if (!betterAuthSecret || betterAuthSecret.length < 32) {
  throw new Error("BETTER_AUTH_SECRET은 32자 이상이어야 합니다.");
}

const database = await getDatabase();

export const auth = betterAuth({
  secret: betterAuthSecret,
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  database: mongodbAdapter(database, {
    transaction: false,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 4,
    autoSignIn: true,
  },
  databaseHooks: {
    user: {
      create: {
        async before(user) {
          const nameFromEmail = user.email.split("@")[0] || user.email;

          return {
            data: {
              ...user,
              name: nameFromEmail,
            },
          };
        },
      },
    },
  },
  plugins: [
    adminPlugin({
      defaultRole: "user",
      adminRoles: ["admin"],
    }),
    nextCookies(),
  ],
});
