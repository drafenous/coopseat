import { NextResponse, type NextRequest } from 'next/server';
import { z, ZodError } from 'zod';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly extra?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export function errorResponse(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    return NextResponse.json(
      { error: { code: err.code, message: err.message, ...err.extra } },
      { status: err.status },
    );
  }
  if (err instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: 'invalid_input',
          message: err.issues[0]?.message ?? 'Dados inválidos.',
          fields: z.flattenError(err).fieldErrors,
        },
      },
      { status: 400 },
    );
  }
  console.error(err);
  return NextResponse.json(
    { error: { code: 'internal', message: 'Erro interno. Tente novamente em instantes.' } },
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
      return errorResponse(err);
    }
  };
}

export async function readJson<T extends z.ZodType>(req: NextRequest, schema: T): Promise<z.infer<T>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ApiError(400, 'invalid_json', 'Corpo da requisição inválido.');
  }
  return schema.parse(body);
}

export function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

export function safeNextPath(value: string | null | undefined, fallback = '/conta'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback;
  return value;
}
