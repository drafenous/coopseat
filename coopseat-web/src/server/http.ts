import { NextResponse, type NextRequest } from 'next/server';
import { z, ZodError } from 'zod';
import { DEFAULT_LOCALE, type Locale } from '@/i18n/config';
import {
  dictionaries,
  errorMessage,
  type ErrorCode,
} from '@/i18n/dictionaries';
import { localeFromRequest } from '@/i18n/server';

/** `code` doubles as the dictionary key; the message is resolved per request locale. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    readonly extra?: Record<string, unknown>,
  ) {
    super(code);
  }
}

export function errorResponse(
  err: unknown,
  locale: Locale = DEFAULT_LOCALE,
): NextResponse {
  const t = dictionaries[locale];
  if (err instanceof ApiError) {
    return NextResponse.json(
      {
        error: {
          code: err.code,
          message: errorMessage(t, err.code),
          ...err.extra,
        },
      },
      { status: err.status },
    );
  }
  if (err instanceof ZodError) {
    const fields = Object.fromEntries(
      Object.entries(
        z.flattenError(err).fieldErrors as Record<string, string[] | undefined>,
      ).map(([field, messages]) => [
        field,
        messages?.map((m) => errorMessage(t, m, 'invalid_input')),
      ]),
    );
    return NextResponse.json(
      {
        error: {
          code: 'invalid_input',
          message: errorMessage(t, err.issues[0]?.message, 'invalid_input'),
          fields,
        },
      },
      { status: 400 },
    );
  }
  console.error(err);
  return NextResponse.json(
    { error: { code: 'internal', message: errorMessage(t, 'internal') } },
    { status: 500 },
  );
}

export function route<C = unknown>(
  handler: (req: NextRequest, ctx: C) => Promise<Response>,
): (req: NextRequest, ctx: C) => Promise<Response> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      return errorResponse(err, localeFromRequest(req));
    }
  };
}

export async function readJson<T extends z.ZodType>(
  req: NextRequest,
  schema: T,
): Promise<z.infer<T>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ApiError(400, 'invalid_json');
  }
  return schema.parse(body);
}

export function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

export function safeNextPath(
  value: string | null | undefined,
  fallback = '/account',
): string {
  if (
    !value ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\')
  )
    return fallback;
  return value;
}
