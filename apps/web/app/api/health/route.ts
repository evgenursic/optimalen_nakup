import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    {
      service: "optimalen-nakup-web",
      status: "ok",
      version: process.env.APP_VERSION ?? "development",
    },
    {
      headers: {
        "cache-control": "no-store",
      },
      status: 200,
    },
  );
}
