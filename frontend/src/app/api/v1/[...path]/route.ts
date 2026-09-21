import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8001';

function buildForwardHeaders(req: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const auth = req.headers.get('authorization');
  if (auth) headers['Authorization'] = auth;
  const profileId = req.headers.get('x-profile-id');
  if (profileId) headers['X-Profile-ID'] = profileId;
  const cookie = req.headers.get('cookie');
  if (cookie) headers['Cookie'] = cookie;
  return headers;
}

function createProxiedResponse(res: Response, data: any, status: number) {
  const nextRes = NextResponse.json(data, { status });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) {
    nextRes.headers.set('set-cookie', setCookie);
  }
  return nextRes;
}

export async function GET(req: NextRequest) {
  try {
    const pathname = req.nextUrl.pathname;
    const search = req.nextUrl.search;
    const backendUrl = `${BACKEND_URL}${pathname}${search}`;
    const res = await fetch(backendUrl, {
      headers: buildForwardHeaders(req),
      cache: 'no-store',
    });
    if (!res.ok) {
      return createProxiedResponse(res, { results: [] }, res.status);
    }
    const data = await res.json();
    return createProxiedResponse(res, data, 200);
  } catch (err) {
    console.error("Proxy GET error:", err);
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const pathname = req.nextUrl.pathname;
    const search = req.nextUrl.search;
    const body = await req.json().catch(() => ({}));
    const backendUrl = `${BACKEND_URL}${pathname}${search}`;
    const res = await fetch(backendUrl, {
      method: 'POST',
      headers: buildForwardHeaders(req),
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return createProxiedResponse(res, data, res.status);
  } catch (err) {
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const pathname = req.nextUrl.pathname;
    const search = req.nextUrl.search;
    const body = await req.json().catch(() => ({}));
    const backendUrl = `${BACKEND_URL}${pathname}${search}`;
    const res = await fetch(backendUrl, {
      method: 'PUT',
      headers: buildForwardHeaders(req),
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return createProxiedResponse(res, data, res.status);
  } catch (err) {
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const pathname = req.nextUrl.pathname;
    const search = req.nextUrl.search;
    const backendUrl = `${BACKEND_URL}${pathname}${search}`;
    const res = await fetch(backendUrl, {
      method: 'DELETE',
      headers: buildForwardHeaders(req),
    });
    const data = await res.json().catch(() => ({}));
    return createProxiedResponse(res, data, res.status);
  } catch (err) {
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
