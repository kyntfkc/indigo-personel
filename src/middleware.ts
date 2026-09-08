import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/api/cron") ||
    pathname.startsWith("/giris") ||
    pathname.startsWith("/kurulum") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  if (!session?.user) {
    if (pathname === "/") {
      return NextResponse.next();
    }
    const url = req.nextUrl.clone();
    url.pathname = "/giris";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  const role = session.user.role;

  if (
    (pathname === "/" ||
      pathname.startsWith("/personel") ||
      pathname.startsWith("/kiosk") ||
      pathname.startsWith("/mesai") ||
      pathname.startsWith("/prim") ||
      pathname.startsWith("/izin") ||
      pathname.startsWith("/raporlar") ||
      pathname.startsWith("/ayarlar")) &&
    role !== "admin"
  ) {
    return NextResponse.redirect(new URL("/benim", req.url));
  }

  // /takvim and /benim are open to both roles
  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
