import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

/**
 * Refreshes a Google OAuth access token using the stored refresh token.
 * Google access tokens expire after ~1 hour, so this is called automatically
 * in the JWT callback whenever the token is near expiry.
 */
async function refreshAccessToken(token: Record<string, unknown>) {
  try {
    const url = "https://oauth2.googleapis.com/token";
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.AUTH_GOOGLE_ID!,
        client_secret: process.env.AUTH_GOOGLE_SECRET!,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken as string,
      }),
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      // Google only returns a new refresh_token occasionally; keep the old one if not provided
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
      // expires_in is in seconds; convert to absolute Unix timestamp (ms)
      expiresAt: Math.floor(Date.now() / 1000) + refreshedTokens.expires_in,
      error: undefined,
    };
  } catch (error) {
    console.error("Error refreshing access token:", error);
    // Return error flag so the session layer and UI can handle re-authentication
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/gmail.readonly",
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // On initial sign-in, persist OAuth tokens from the account object
      if (account) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          // expires_at from Google is already in Unix seconds
          expiresAt: account.expires_at,
          error: undefined,
        };
      }

      // If token is still valid (with a 60-second buffer), return it as-is
      if (
        typeof token.expiresAt === "number" &&
        Date.now() / 1000 < token.expiresAt - 60
      ) {
        return token;
      }

      // Token is expired (or missing expiry) — attempt to refresh
      if (!token.refreshToken) {
        // No refresh token available; force re-login
        return { ...token, error: "RefreshAccessTokenError" };
      }

      return refreshAccessToken(token);
    },
    async session({ session, token }: any) {
      // Expose the access token and any errors to the client session
      session.accessToken = token.accessToken;
      session.error = token.error;
      return session;
    },
  },
  secret: process.env.AUTH_SECRET,
  pages: {
    signIn: "/",
  },
});
