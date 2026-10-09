import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.BACKEND_URL || 'http://127.0.0.1:8001';

function buildForwardHeaders(req: NextRequest, hasBody: boolean = false): Record<string, string> {
  const headers: Record<string, string> = {};

  const incomingContentType = req.headers.get('content-type');
  if (incomingContentType) {
    headers['Content-Type'] = incomingContentType;
  } else if (hasBody) {
    headers['Content-Type'] = 'application/json';
  }

  const auth = req.headers.get('authorization');
  if (auth) headers['Authorization'] = auth;

  const profileId = req.headers.get('x-profile-id');
  if (profileId) headers['X-Profile-ID'] = profileId;

  const cookie = req.headers.get('cookie');
  if (cookie) headers['Cookie'] = cookie;

  // Forward client IP to ensure backend rate-limiting behaves correctly
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip') || (req as any).ip;
  if (forwardedFor) {
    headers['X-Forwarded-For'] = forwardedFor;
  } else if (realIp) {
    headers['X-Forwarded-For'] = realIp;
  }
  if (realIp) {
    headers['X-Real-IP'] = realIp;
  }

  return headers;
}

function createProxiedResponse(res: Response, data: any, status: number) {
  // HTTP 204 No Content must NOT have a response body
  let nextRes: NextResponse;
  if (status === 204 || status === 205 || data === null) {
    nextRes = new NextResponse(null, { status });
  } else {
    nextRes = NextResponse.json(data, { status });
  }

  // Preserve all Set-Cookie headers accurately without truncation
  if (typeof (res.headers as any).getSetCookie === 'function') {
    const cookies: string[] = (res.headers as any).getSetCookie();
    cookies.forEach((cookie) => {
      nextRes.headers.append('set-cookie', cookie);
    });
  } else {
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      nextRes.headers.set('set-cookie', setCookie);
    }
  }

  return nextRes;
}

const TMDB_API_KEY = process.env.TMDB_API_KEY || '8b36fc4dff6127d090085bcebf286978';

async function fetchFromTmdbDirect(pathname: string, searchParams: URLSearchParams) {
  try {
    const tmdbPrefixIndex = pathname.indexOf('/tmdb/');
    if (tmdbPrefixIndex === -1) return null;
    const tmdbSubPath = pathname.slice(tmdbPrefixIndex + 5);
    const url = new URL(`https://api.themoviedb.org/3${tmdbSubPath}`);
    searchParams.forEach((val, key) => {
      url.searchParams.set(key, val);
    });
    url.searchParams.set('api_key', TMDB_API_KEY);

    const tmdbRes = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });
    if (!tmdbRes.ok) return null;
    return await tmdbRes.json();
  } catch (err) {
    console.warn("Direct TMDB fallback failed:", err);
    return null;
  }
}

export async function GET(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const search = req.nextUrl.search;
  const isTmdbRoute = pathname.includes('/tmdb/');

  try {
    const backendUrl = `${BACKEND_URL}${pathname}${search}`;
    const fetchOptions: RequestInit = {
      headers: buildForwardHeaders(req, false),
      cache: 'no-store',
      signal: isTmdbRoute ? AbortSignal.timeout(5000) : undefined,
    };

    const res = await fetch(backendUrl, fetchOptions);

    if (res.status === 204) {
      return createProxiedResponse(res, null, 204);
    }

    if (res.ok) {
      const data = await res.json().catch(() => ({ detail: res.statusText }));
      return createProxiedResponse(res, data, res.status);
    }

    // If backend returned an error on a TMDB route, try direct TMDB fallback
    if (isTmdbRoute && res.status >= 500) {
      const directData = await fetchFromTmdbDirect(pathname, req.nextUrl.searchParams);
      if (directData) {
        return NextResponse.json(directData);
      }
    }

    const data = await res.json().catch(() => ({ detail: res.statusText }));
    return createProxiedResponse(res, data, res.status);
  } catch (err: any) {
    // If backend failed (timeout, network error) on a TMDB route, try direct TMDB fallback
    if (isTmdbRoute) {
      const directData = await fetchFromTmdbDirect(pathname, req.nextUrl.searchParams);
      if (directData) {
        return NextResponse.json(directData);
      }
    }

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
      headers: buildForwardHeaders(req, true),
      body: JSON.stringify(body),
    });

    if (res.status === 204) {
      return createProxiedResponse(res, null, 204);
    }

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
      headers: buildForwardHeaders(req, true),
      body: JSON.stringify(body),
    });

    if (res.status === 204) {
      return createProxiedResponse(res, null, 204);
    }

    const data = await res.json().catch(() => ({ detail: res.statusText }));
    return createProxiedResponse(res, data, res.status);
  } catch (err: any) {
    console.error("Proxy PUT error:", err);
    return NextResponse.json({ detail: err?.message || "Proxy PUT failed", status: "error" }, { status: 502 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const pathname = req.nextUrl.pathname;
    const search = req.nextUrl.search;
    const body = await req.json().catch(() => ({}));
    const backendUrl = `${BACKEND_URL}${pathname}${search}`;
    const res = await fetch(backendUrl, {
      method: 'PATCH',
      headers: buildForwardHeaders(req, true),
      body: JSON.stringify(body),
    });

    if (res.status === 204) {
      return createProxiedResponse(res, null, 204);
    }

    const data = await res.json().catch(() => ({ detail: res.statusText }));
    return createProxiedResponse(res, data, res.status);
  } catch (err: any) {
    console.error("Proxy PATCH error:", err);
    return NextResponse.json({ detail: err?.message || "Proxy PATCH failed", status: "error" }, { status: 502 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const pathname = req.nextUrl.pathname;
    const search = req.nextUrl.search;
    const backendUrl = `${BACKEND_URL}${pathname}${search}`;
    const res = await fetch(backendUrl, {
      method: 'DELETE',
      headers: buildForwardHeaders(req, false),
    });

    if (res.status === 204) {
      return createProxiedResponse(res, null, 204);
    }

    const data = await res.json().catch(() => ({ detail: res.statusText }));
    return createProxiedResponse(res, data, res.status);
  } catch (err: any) {
    console.error("Proxy DELETE error:", err);
    return NextResponse.json({ detail: err?.message || "Proxy DELETE failed", status: "error" }, { status: 502 });
  }
}
