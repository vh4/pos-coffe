import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002/api";

async function refreshAccessToken(token: any) {
    try {
        const response = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken: token.refreshToken,
        });

        const data = response.data as any;

        return {
            ...token,
            accessToken: data.accessToken,
            accessTokenExpires: Date.now() + 5 * 60 * 1000, // 5 minutes
            // We keep the same refreshToken if the backend doesn't rotate it
        };
    } catch (error) {
        console.error("RefreshTokenError", error);
        return {
            ...token,
            error: "RefreshAccessTokenError",
        };
    }
}

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Sign In Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                try {
                    const res = await axios.post(`${API_URL}/auth/login`, {
                        email: credentials.email,
                        password: credentials.password,
                    });

                    const user = res.data as any;

                    if (user && user.accessToken) {
                        return {
                            id: user.user.id,
                            email: user.user.email,
                            fullName: user.user.fullName,
                            role: user.user.role,
                            accessToken: user.accessToken,
                            refreshToken: user.refreshToken,
                        } as any;
                    }
                    return null;
                } catch (error: any) {
                    console.error("Auth error", error.response?.data);
                    throw new Error(error.response?.data?.message || "Login failed");
                }
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            // Initial sign in
            if (user) {
                return {
                    ...token,
                    accessToken: user.accessToken,
                    refreshToken: user.refreshToken,
                    fullName: user.fullName,
                    role: user.role,
                    id: user.id,
                    accessTokenExpires: Date.now() + 5 * 60 * 1000,
                };
            }

            // Return previous token if the access token has not expired yet
            if (Date.now() < token.accessTokenExpires) {
                return token;
            }

            // Access token has expired, try to update it
            return refreshAccessToken(token);
        },
        async session({ session, token }) {
            session.user = {
                ...session.user,
                id: token.id as string,
                fullName: token.fullName as string,
                role: token.role as any,
            };
            session.accessToken = token.accessToken as string;
            session.refreshToken = token.refreshToken as string;
            session.error = token.error as string;

            return session;
        },
    },
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt",
        maxAge: 7 * 24 * 60 * 60, // 7 days
    },
    secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
