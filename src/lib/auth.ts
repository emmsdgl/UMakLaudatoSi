/**
 * ============================================================================
 * NEXTAUTH CONFIGURATION
 * ============================================================================
 * Centralized authentication configuration for NextAuth.js.
 * Separated from route handler to avoid Next.js export constraints.
 * 
 * ROUTING:
 * - Admin users → /admin dashboard
 * - Regular users → /home dashboard
 * ============================================================================
 */

import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { supabase } from "@/lib/supabase";

// Admin roles that should be redirected to admin dashboard
const ADMIN_ROLES = ['admin', 'canteen_admin', 'finance_admin', 'sa_admin', 'super_admin'];

/**
 * NextAuth configuration options
 * - Google OAuth provider
 * - Session callback to attach user ID and role from database
 * - Redirect callback to route admins to admin dashboard
 */
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),
  ],
  callbacks: {
    /**
     * Sign in callback - creates/updates user in database
     * No email domain restriction - all Google accounts allowed
     * UMak users get student role, others get guest role
     */
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        const isUMakUser = user.email.endsWith("@umak.edu.ph");

        // Check if user exists
        const { data: existingUser } = await supabase
          .from("users")
          .select("*")
          .eq("email", user.email)
          .single();

        if (!existingUser) {
          // Create new user with a null role — the user will select
          // their role via the post-login role selection modal.
          // We use the admin client to bypass the CHECK constraint
          // since role will be set immediately after via /api/auth/set-role.
          await supabase.from("users").insert({
            email: user.email,
            name: user.name || "Anonymous",
            avatar_url: user.image,
            role: null,
          });
        }
      }
      return true;
    },
    /**
     * Session callback - attaches database user ID and role to session
     */
    async session({ session }) {
      if (session.user?.email) {
        const { data: userData } = await supabase
          .from("users")
          .select("id, role")
          .eq("email", session.user.email)
          .single();

        if (userData) {
          session.user.id = userData.id;
          (session.user as any).role = userData.role;
        }
      }
      return session;
    },
    /**
     * Redirect callback - routes users based on role
     * Admins go to /admin, regular users go to /home
     */
    async redirect({ url, baseUrl }) {
      // If it's a relative URL, make it absolute
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }
      // If it's the same origin, allow it
      if (url.startsWith(baseUrl)) {
        return url;
      }
      // Default to base URL
      return baseUrl;
    },
  },
  pages: {
    signIn: "/",
  },
  secret: process.env.NEXTAUTH_SECRET,
  events: {
    /**
     * After sign in, check role and set redirect URL
     */
    async signIn({ user }) {
      // Role-based redirect is handled in the page component
    },
  },
};
