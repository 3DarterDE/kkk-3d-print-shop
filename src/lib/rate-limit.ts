import { NextRequest } from 'next/server';

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

type RateResult = { success: boolean; remaining: number; resetTime: number };

async function rateLimitUpstash(identifier: string, maxRequests: number, windowMs: number): Promise<RateResult | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const key = `ratelimit:${identifier}`;
  const now = Date.now();
  try {
    const resp = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([
        ['INCR', key],
        ['PTTL', key],
      ])
    });
    const data = await resp.json();
    const count = Number(data?.[0]);
    let pttl = Number(data?.[1]);
    if (isNaN(pttl) || pttl < 0) {
      // set expiry in ms
      await fetch(`${url}/pipeline`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([
          ['PEXPIRE', key, String(windowMs)],
          ['PTTL', key],
        ])
      }).then(r => r.json()).then(arr => {
        pttl = Number(arr?.[1]);
      }).catch(() => {});
    }
    if (count > maxRequests) {
      return { success: false, remaining: 0, resetTime: now + Math.max(0, pttl) };
    }
    return { success: true, remaining: Math.max(0, maxRequests - count), resetTime: now + Math.max(0, pttl) };
  } catch {
    return null;
  }
}

export function rateLimit(
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60 * 1000 // 1 minute
): RateResult {
  const now = Date.now();
  const key = identifier;
  
  const current = rateLimitMap.get(key);
  
  if (!current || now > current.resetTime) {
    // Reset or create new entry
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + windowMs
    });
    
    return {
      success: true,
      remaining: maxRequests - 1,
      resetTime: now + windowMs
    };
  }
  
  if (current.count >= maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetTime: current.resetTime
    };
  }
  
  // Increment count
  current.count++;
  rateLimitMap.set(key, current);
  
  return {
    success: true,
    remaining: maxRequests - current.count,
    resetTime: current.resetTime
  };
}

export async function rateLimitRequest(
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60 * 1000
): Promise<RateResult> {
  const upstash = await rateLimitUpstash(identifier, maxRequests, windowMs);
  if (upstash) return upstash;
  return rateLimit(identifier, maxRequests, windowMs);
}

export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return 'unknown';
}
