import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            fullName: string;
            role: 'admin' | 'kasir' | 'chef';
        } & DefaultSession["user"];
        accessToken: string;
        refreshToken: string;
        error?: string;
    }

    interface User {
        id: string;
        fullName: string;
        role: 'admin' | 'kasir' | 'chef';
        accessToken: string;
        refreshToken: string;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        fullName: string;
        role: 'admin' | 'kasir' | 'chef';
        accessToken: string;
        refreshToken: string;
        accessTokenExpires: number;
        error?: string;
    }
}
