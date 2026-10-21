import { SlidersHorizontal } from 'lucide-react';
import type { Mode } from '../../types';
import type { Settings } from '../../lib/settings';
import { Collapsible, SelectField, ToggleField } from '../molecules';
import { useT } from '../../i18n';

const RESOLUTIONS = ['1920x1080', '1280x720', '640x480', '3840x2160'];
const FPS = [60, 30];
const FORMAT_ORDER = ['NV12', 'YUY2', 'MJPG'];

function formatRank(format: string) {
  const index = FORMAT_ORDER.indexOf(format);
  return index === -1 ? FORMAT_ORDER.length : index;
}

function resolutionKey(mode: { width: number; height: number }) {
  return `${mode.width}x${mode.height}`;
}

function fpsLabel(fps: number) {
  return fps.toFixed(2).replace(/\.00$/, '');
}

/** The mode closest to the requested size, frame rate and pixel format. */
function pickMode(
  modes: Mode[],
  want: { width: number; height: number; fps: number; format: string },
) {
  const sameSize = modes.filter(
    (mode) => mode.width === want.width && mode.height === want.height,
  );
  const pool = sameSize.length ? sameSize : modes;
  return pool.slice().sort((a, b) => {
    const fps = Math.abs(a.fps - want.fps) - Math.abs(b.fps - want.fps);
    if (fps) return fps;
    const format =
      Number(a.format !== want.format) - Number(b.format !== want.format);
    if (format) return format;
    return formatRank(a.format) - formatRank(b.format) || a.index - b.index;
  })[0];
}

type Props = {
  settings: Settings;
  change<K extends keyof Settings>(key: K, value: Settings[K]): void;
  modes: Mode[];
  locked: boolean;
};

export function AdvancedSettings({
  settings: s,
  change,
  modes,
  locked,
}: Props) {
  const t = useT().advanced;
  const current = modes.find((mode) => mode.index === s.mode);
  const resolutions = [
    ...new Map(modes.map((mode) => [resolutionKey(mode), mode])).values(),
  ].sort(
    (a, b) => b.width * b.height - a.width * a.height || b.width - a.width,
  );
  const frameRates = current
    ? [
        ...new Set(
          modes
            .filter(
              (mode) =>
                mode.width === current.width && mode.height === current.height,
            )
            .map((mode) => mode.fps),
        ),
      ].sort((a, b) => b - a)
    : [];
  const formats = current
    ? [
        ...new Set(
          modes
            .filter(
              (mode) =>
                mode.width === current.width &&
                mode.height === current.height &&
                mode.fps === current.fps,
            )
            .map((mode) => mode.format),
        ),
      ].sort((a, b) => formatRank(a) - formatRank(b) || a.localeCompare(b))
    : [];
  const choose = (want: {
    width: number;
    height: number;
    fps: number;
    format: string;
  }) => {
    const next = pickMode(modes, want);
    if (next && next.index !== s.mode) change('mode', next.index);
  };
  return (
    <Collapsible
      icon={<SlidersHorizontal size={14} />}
      title={t.title}
      disabled={locked}
    >
      {s.backend === 'native' ? (
        <>
          <SelectField
            label={t.resolution}
            disabled={locked || !modes.length}
            value={current ? resolutionKey(current) : ''}
            placeholder={t.noModes}
            onChange={(key) => {
              const [width, height] = key.split('x').map(Number);
              choose({
                width,
                height,
                fps: current?.fps ?? 60,
                format: current?.format ?? 'NV12',
              });
            }}
            options={resolutions.map((mode) => ({
              value: resolutionKey(mode),
              label: `${mode.width} × ${mode.height}`,
            }))}
          />
          <div className="grid grid-cols-2 gap-2.5">
            <SelectField
              label="FPS"
              disabled={locked || !frameRates.length}
              value={current?.fps ?? 0}
              placeholder={t.noModes}
              onChange={(fps) => {
                if (!current) return;
                choose({
                  width: current.width,
                  height: current.height,
                  fps,
                  format: current.format,
                });
              }}
              options={frameRates.map((fps) => ({
                value: fps,
                label: fpsLabel(fps),
              }))}
            />
            <SelectField
              label={t.format}
              disabled={locked || !formats.length}
              value={current?.format ?? ''}
              placeholder={t.noModes}
              onChange={(format) => {
                if (!current) return;
                choose({
                  width: current.width,
                  height: current.height,
                  fps: current.fps,
                  format,
                });
              }}
              options={formats.map((format) => ({
                value: format,
                label: format,
              }))}
            />
          </div>
        </>
      ) : (
        <div className="grid grid-cols-[1fr_84px] gap-2.5">
          <SelectField
            label={t.resolution}
            disabled={locked}
            value={s.resolution}
            onChange={(v) => change('resolution', v)}
            options={RESOLUTIONS.map((r) => ({
              value: r,
              label: r.replace('x', ' × '),
            }))}
          />
          <SelectField
            label="FPS"
            disabled={locked}
            value={s.fps}
            onChange={(v) => change('fps', v)}
            options={FPS.map((f) => ({ value: f, label: String(f) }))}
          />
        </div>
      )}
      <ToggleField
        label="VSync"
        hint={s.backend === 'native' ? t.vsyncNative : t.vsyncCompat}
        checked={s.vsync}
        disabled={locked || s.backend !== 'native'}
        onChange={(v) => change('vsync', v)}
      />
    </Collapsible>
  );
}
