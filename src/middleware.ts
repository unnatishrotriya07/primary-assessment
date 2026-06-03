import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const { pathname } = request.nextUrl;

  // Protect admin dashboards and student testing routes
  const isDashboardRoute = pathname.startsWith("/dashboard") || 
                            pathname.startsWith("/classes") || 
                            pathname.startsWith("/subjects") ||
                            pathname.startsWith("/chapters") ||
                            pathname.startsWith("/questions") ||
                            pathname.startsWith("/assessments") ||
                            pathname.startsWith("/reports");
  const isStudentRoute = pathname.startsWith("/assessment") || 
                         pathname.startsWith("/result");

  if ((isDashboardRoute || isStudentRoute) && !token) {
    // In a real application, you would redirect to login if unauthorized.
    // For demo/scaffold purposes, we let the route pass or log.
    console.log(`Middleware intercepted route: ${pathname} (no token found)`);
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
    "/assessment/:path*",
    "/result/:path*",
  ],
};
