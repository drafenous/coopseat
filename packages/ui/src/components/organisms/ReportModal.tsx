import { useEffect, useRef, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { useT } from '../../i18n';
import { api, ApiError } from '../../lib/api';
import { Button, FieldHint } from '../atoms';
import { TurnstileField } from '../molecules/TurnstileField';
import {
  Alert,
  Field,
  Modal,
  ModalActions,
  SelectField,
  fieldClass,
} from '../molecules';

const MAX_IMAGES = 3;
const MAX_BYTES = 1024 * 1024;

type Category = 'abuse' | 'technical' | 'feedback';
type Surface = 'play' | 'party' | 'desktop';
type Evidence = { data: string; preview: string };

type Props = {
  email: string;
  room: string | null;
  surface: Surface;
  onClose(): void;
};

export function ReportModal({
  email: initialEmail,
  room,
  surface,
  onClose,
}: Props) {
  const all = useT();
  const t = all.report;
  const fileRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef<Evidence[]>([]);
  const emailEdited = useRef(false);
  const [category, setCategory] = useState<Category>('feedback');
  const [email, setEmail] = useState(initialEmail);
  const [message, setMessage] = useState('');
  const [images, setImages] = useState<Evidence[]>([]);
  const [imageError, setImageError] = useState<string>();
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState<string>();
  const [pending, setPending] = useState(false);
  const [siteKey, setSiteKey] = useState('');
  const [captcha, setCaptcha] = useState<string>();
  const [captchaReset, setCaptchaReset] = useState(0);

  imagesRef.current = images;
  useEffect(() => {
    if (!emailEdited.current) setEmail(initialEmail);
  }, [initialEmail]);
  useEffect(() => {
    let cancelled = false;
    api<{ siteKey?: string }>('/api/captcha', { auth: false })
      .then((body) => {
        if (!cancelled && body.siteKey) setSiteKey(body.siteKey);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(
    () => () => {
      for (const image of imagesRef.current) URL.revokeObjectURL(image.preview);
    },
    [],
  );

  function removeImage(index: number) {
    const image = imagesRef.current[index];
    if (!image) return;
    URL.revokeObjectURL(image.preview);
    const next = imagesRef.current.filter((_, i) => i !== index);
    imagesRef.current = next;
    setImages(next);
  }

  async function addFiles(list: FileList | null) {
    const files = list ? [...list] : [];
    if (!files.length) return;
    setImageError(undefined);
    let problem: string | undefined;
    for (const file of files) {
      if (imagesRef.current.length >= MAX_IMAGES) {
        problem = t.imageLimit;
        break;
      }
      const read = await readEvidence(file);
      if (typeof read === 'string') {
        problem = read === 'size' ? t.imageSize : t.imageType;
        continue;
      }
      if (imagesRef.current.length >= MAX_IMAGES) {
        URL.revokeObjectURL(read.preview);
        problem = t.imageLimit;
        break;
      }
      const next = [...imagesRef.current, read];
      imagesRef.current = next;
      setImages(next);
    }
    if (problem) setImageError(problem);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(undefined);
    const website = String(new FormData(e.currentTarget).get('website') ?? '');
    try {
      const res = await api<{ message: string }>('/api/report', {
        method: 'POST',
        body: {
          category,
          email,
          message,
          images: imagesRef.current.map((image) => image.data),
          room: room || undefined,
          surface,
          website,
          captchaToken: captcha,
        },
      });
      setSent(res.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : all.api.generic);
      setCaptcha(undefined);
      setCaptchaReset((n) => n + 1);
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal
      labelledBy="report-title"
      closeButton
      onClose={onClose}
      onSubmit={sent ? undefined : onSubmit}
    >
      <h2 id="report-title">{t.title}</h2>
      {sent ? (
        <>
          <Alert tone="success">{sent}</Alert>
          <ModalActions>
            <Button inline onClick={onClose}>
              {all.common.close}
            </Button>
          </ModalActions>
        </>
      ) : (
        <>
          {error ? <Alert>{error}</Alert> : null}
          <SelectField<Category>
            label={t.category}
            value={category}
            options={(['abuse', 'technical', 'feedback'] as const).map(
              (value) => ({ value, label: t.categories[value] }),
            )}
            onChange={(value) => setCategory(value)}
          />
          <Field
            label={t.email}
            type="email"
            autoComplete="email"
            required
            value={email}
            hint={t.emailHint}
            onChange={(e) => {
              emailEdited.current = true;
              setEmail(e.target.value);
            }}
          />
          <label className={fieldClass}>
            {t.message}
            <textarea
              required
              rows={5}
              maxLength={4000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full resize-y rounded-[7px] border border-[#304050] bg-field px-2.5 py-2 text-[13px] text-field-text hover:border-[#3d5163]"
            />
          </label>
          <div className={fieldClass}>
            <span>{t.images}</span>
            <div className="flex flex-wrap gap-2">
              {images.map((image, index) => (
                <div key={image.preview} className="relative">
                  <img
                    src={image.preview}
                    alt=""
                    className="h-16 w-16 rounded-lg border border-[#304050] object-cover"
                  />
                  <button
                    type="button"
                    aria-label={t.removeImage}
                    onClick={() => removeImage(index)}
                    className="absolute -top-1.5 -right-1.5 rounded-full border border-[#304050] bg-[#121921] p-0.5 text-[#a5b2c3] hover:text-[#effff8]"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="secondary"
              compact
              disabled={images.length >= MAX_IMAGES}
              onClick={() => fileRef.current?.click()}
            >
              {t.addImage}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              aria-label={t.addImage}
              onChange={(e) => {
                void addFiles(e.target.files);
                e.target.value = '';
              }}
            />
            {imageError ? (
              <FieldHint warn flush>
                {imageError}
              </FieldHint>
            ) : (
              <FieldHint muted flush>
                {t.imagesHint}
              </FieldHint>
            )}
          </div>
          <input
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden
            className="absolute h-px w-px overflow-hidden opacity-0"
          />
          {siteKey ? (
            <TurnstileField
              siteKey={siteKey}
              onToken={setCaptcha}
              resetKey={captchaReset}
            />
          ) : null}
          <ModalActions>
            <Button variant="secondary" onClick={onClose}>
              {all.common.cancel}
            </Button>
            <Button type="submit" inline disabled={pending}>
              {pending ? t.pending : t.submit}
            </Button>
          </ModalActions>
        </>
      )}
    </Modal>
  );
}

function sniff(bytes: Uint8Array): boolean {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  )
    return true;
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
    return true;
  return (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  );
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function readEvidence(file: File): Promise<Evidence | 'size' | 'type'> {
  if (file.size > MAX_BYTES) return 'size';
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!sniff(bytes)) return 'type';
  return { data: toBase64(bytes), preview: URL.createObjectURL(file) };
}
