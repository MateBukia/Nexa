import { NextResponse } from "next/server";
import { isLocale } from "@/lib/i18n/messages";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    locale?: string;
  } | null;
  if (!isLocale(body?.locale))
    return NextResponse.json(
      { message: "Unsupported locale." },
      { status: 400 },
    );
  const response = NextResponse.json({ locale: body.locale });
  response.cookies.set("locale", body.locale, {
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
