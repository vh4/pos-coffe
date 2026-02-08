import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
    function middleware(req) {
        const token = req.nextauth.token;
        const { pathname } = req.nextUrl;

        // 1. Handle authenticated users visiting the login page
        if (pathname === "/login" && !!token) {
            if (token.role === "admin") {
                return NextResponse.redirect(new URL("/admin/dashboard", req.url));
            } else if (token.role === "chef") {
                return NextResponse.redirect(new URL("/kitchen/display", req.url));
            } else {
                return NextResponse.redirect(new URL("/", req.url));
            }
        }

        // 2. Protect Admin Routes
        if (pathname.startsWith("/admin") && token?.role !== "admin") {
            return NextResponse.redirect(new URL("/", req.url));
        }

        // 3. Protect Kitchen Routes
        if (pathname.startsWith("/kitchen")) {
            const isAuthorized = token?.role === "chef" || token?.role === "admin";
            if (!isAuthorized) {
                return NextResponse.redirect(new URL("/", req.url));
            }
        }

        // 4. Protect Root Route (POS/Cashier)
        if (pathname === "/") {
            if (token?.role === "chef") {
                return NextResponse.redirect(new URL("/kitchen/display", req.url));
            }
            if (token?.role !== "admin" && token?.role !== "kasir") {
                return NextResponse.redirect(new URL("/login", req.url));
            }
        }

        return NextResponse.next();
    },
    {
        callbacks: {
            authorized: ({ token, req }) => {
                const { pathname } = req.nextUrl;

                // Allow access to login page even if not authenticated
                // (The middleware function itself will handle redirecting if THEY ARE authenticated)
                if (pathname === "/login") {
                    return true;
                }

                // Everything else requires authentication
                return !!token;
            },
        },
        pages: {
            signIn: "/login",
        },
    }
);

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public (public files)
         */
        "/((?!api|_next/static|_next/image|favicon.ico|public).*)",
    ],
};
