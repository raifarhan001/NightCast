import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8001';

export async function GET(req: NextRequest) {
  try {
    const pathname = req.nextUrl.pathname;
    const search = req.nextUrl.search;
    const backendUrl = `${BACKEND_URL}${pathname}${search}`;
    const res = await fetch(backendUrl, {
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });
    if (!res.ok) {
      return NextResponse.json({ results: [] }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error("TMDB Proxy GET error:", err);
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}
