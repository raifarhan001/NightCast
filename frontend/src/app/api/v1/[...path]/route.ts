import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.BACKEND_URL || 'http://127.0.0.1:8001';

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
    const data = await res.json().catch(() => ({ detail: res.statusText }));
    return createProxiedResponse(res, data, res.status);
  } catch (err: any) {
    console.error("Proxy GET error:", err);
    return NextResponse.json({ detail: err?.message || "Proxy GET failed", results: [] }, { status: 502 });
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
    const data = await res.json().catch(() => ({ detail: res.statusText }));
    return createProxiedResponse(res, data, res.status);
  } catch (err: any) {
    console.error("Proxy POST error:", err);
    return NextResponse.json({ detail: err?.message || "Proxy POST failed", status: "error" }, { status: 502 });
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
    const data = await res.json().catch(() => ({ detail: res.statusText }));
    return createProxiedResponse(res, data, res.status);
  } catch (err: any) {
    console.error("Proxy PUT error:", err);
    return NextResponse.json({ detail: err?.message || "Proxy PUT failed", status: "error" }, { status: 502 });
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
    const data = await res.json().catch(() => ({ detail: res.statusText }));
    return createProxiedResponse(res, data, res.status);
  } catch (err: any) {
    console.error("Proxy DELETE error:", err);
    return NextResponse.json({ detail: err?.message || "Proxy DELETE failed", status: "error" }, { status: 502 });
  }
}
