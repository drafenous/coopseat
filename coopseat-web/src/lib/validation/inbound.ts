import { z } from 'zod';
import { captchaSchema, emailSchema } from './account';

export const MAX_IMAGE_BYTES = 1024 * 1024;
/** Base64 length of a 1 MB file, plus a short data-URL prefix. */
export const MAX_IMAGE_CHARS = Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 64;

const messageSchema = z
  .string()
  .trim()
  .min(1, 'message_required')
  .max(4000, 'message_too_long');

export const contactSchema = z.object({
  name: z.string().trim().min(1, 'name_required').max(80, 'name_too_long'),
  email: emailSchema,
  message: messageSchema,
  captchaToken: captchaSchema,
});

export const reportSchema = z.object({
  category: z.enum(['abuse', 'technical', 'feedback']),
  email: emailSchema,
  message: messageSchema,
  surface: z.enum(['play', 'party', 'desktop']),
  room: z
    .string()
    .trim()
    .max(40, 'invalid_input')
    .optional()
    .transform((value) => value || undefined),
  website: z.string().max(200).optional(),
  images: z
    .array(z.string().min(1).max(MAX_IMAGE_CHARS, 'image_too_large'))
    .max(3, 'too_many_images')
    .optional(),
});

export type ReportCategory = z.infer<typeof reportSchema>['category'];
export type ReportSurface = z.infer<typeof reportSchema>['surface'];

export type ParsedImage = {
  filename: string;
  content: string;
  contentType: string;
};

const SIGNATURES = {
  jpeg: { ext: 'jpg', contentType: 'image/jpeg' },
  png: { ext: 'png', contentType: 'image/png' },
  webp: { ext: 'webp', contentType: 'image/webp' },
} as const;

function sniff(bytes: Buffer): keyof typeof SIGNATURES | null {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  )
    return 'jpeg';
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  )
    return 'png';
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  )
    return 'webp';
  return null;
}

/** Confirms the bytes, not the declared type. Returns an error code when the file is unusable. */
export function parseEvidence(
  data: string,
  index: number,
): ParsedImage | 'image_too_large' | 'image_invalid' {
  const raw = data
    .replace(/^data:image\/[a-z0-9.+-]+;base64,/i, '')
    .replace(/\s/g, '');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(raw)) return 'image_invalid';
  const bytes = Buffer.from(raw, 'base64');
  if (bytes.length === 0) return 'image_invalid';
  if (bytes.length > MAX_IMAGE_BYTES) return 'image_too_large';
  const kind = sniff(bytes);
  if (!kind) return 'image_invalid';
  const meta = SIGNATURES[kind];
  return {
    filename: `evidence-${index + 1}.${meta.ext}`,
    content: raw,
    contentType: meta.contentType,
  };
}
