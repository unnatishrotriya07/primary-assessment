import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function getUserFromToken(token: string | undefined): any {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length < 3) return null;
    // Decode base64 URL safe string in edge environment
    const rawPayload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(rawPayload));
    return payload;
  } catch (e) {
    console.error("Failed to decode JWT in middleware:", e);
    return null;
  }
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const { pathname } = request.nextUrl;

  // Protect Dashboards and student testing routes
  const isDashboardRoute = pathname.startsWith("/dashboard") ||
    pathname.startsWith("/classes") ||
    pathname.startsWith("/subjects") ||
    pathname.startsWith("/chapters") ||
    pathname.startsWith("/questions") ||
    pathname.startsWith("/assessments") ||
    pathname.startsWith("/reports") ||
    pathname.startsWith("/team");

  const isStudentRoute = pathname.startsWith("/assessment") ||
    pathname.startsWith("/result");

  // If attempting to access dashboard pages without a token, redirect to login
  if (isDashboardRoute && !token) {
    console.log(`Middleware blocked unauthorized route: ${pathname} (no token found)`);
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (token) {
    const user = getUserFromToken(token);

    if (user) {
      // 1. Team Settings access: only Super-Admin (role == admin, tenant == null) or Director (role == director)
      if (pathname.startsWith("/team")) {
        const isSuperAdmin = user.role === "admin" && !user.tenant_id;
        const isDirector = user.role === "director";
        if (!isSuperAdmin && !isDirector) {
          console.log(`Middleware blocked access to /team for role: ${user.role}`);
          return NextResponse.redirect(new URL("/unauthorized", request.url));
        }
      }

      // 2. Feature-based permission checking (for Director/Teacher roles)
      // Note: Super-Admin (role == admin, tenant == null) has global bypass
      const isSuperAdmin = user.role === "admin" && !user.tenant_id;
      if (!isSuperAdmin) {
        let matchedFeature = "";
        if (pathname.startsWith("/dashboard")) matchedFeature = "dashboard";
        else if (pathname.startsWith("/classes")) matchedFeature = "classes";
        else if (pathname.startsWith("/subjects")) matchedFeature = "subjects";
        else if (pathname.startsWith("/chapters")) matchedFeature = "chapters";
        else if (pathname.startsWith("/questions")) matchedFeature = "questions";
        else if (pathname.startsWith("/assessments")) matchedFeature = "assessments";
        else if (pathname.startsWith("/reports")) matchedFeature = "reports";

        if (matchedFeature) {
          const allowedFeatures = user.allowed_features || [];
          if (!allowedFeatures.includes(matchedFeature)) {
            console.log(`Middleware blocked access to feature: ${matchedFeature} for user: ${user.sub}`);
            return NextResponse.redirect(new URL("/unauthorized", request.url));
          }
        }
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/classes/:path*",
    "/subjects/:path*",
    "/chapters/:path*",
    "/questions/:path*",
    "/assessments/:path*",
    "/reports/:path*",
    "/team/:path*",
    "/assessment/:path*",
    "/result/:path*",
  ],
};
