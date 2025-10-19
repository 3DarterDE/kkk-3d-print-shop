import { NextRequest, NextResponse } from 'next/server';

function toHex(bytes: Uint8Array) {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    out += (b < 16 ? '0' : '') + b.toString(16);
  }
  return out;
}

function generateToken(): string {
  const c: any = (globalThis as any).crypto;
  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID().replace(/-/g, '');
  }
  if (c && typeof c.getRandomValues === 'function') {
    const arr = new Uint8Array(32);
    c.getRandomValues(arr);
    return toHex(arr);
  }
  return `${Date.now().toString(36)}.${Math.random().toString(36).slice(2, 12)}`;
}

export function ensureCsrfCookie(request: NextRequest, res?: NextResponse) {
  const existing = request.cookies.get('csrf_token')?.value;
  const token = existing || generateToken();
  const r = res || NextResponse.next();
  r.cookies.set('csrf_token', token, { path: '/', secure: true, sameSite: 'lax' });
  return { token, response: r };
}

export function methodNeedsCsrf(method: string) {
  const m = method.toUpperCase();
  return m === 'POST' || m === 'PUT' || m === 'PATCH' || m === 'DELETE';
}

export async function verifyCsrfFromRequest(req: NextRequest) {
  if (!methodNeedsCsrf(req.method)) return true;
  const cookieToken = req.cookies.get('csrf_token')?.value;
  const headerToken = req.headers.get('x-csrf-token');
  return Boolean(cookieToken && headerToken && cookieToken === headerToken);
}


