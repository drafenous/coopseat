import type { ReactNode } from 'react';
import {
  ArrowUpRight,
  AudioLines,
  Bookmark,
  Cable,
  PanelLeftClose,
  PanelRightClose,
  RefreshCw,
  Settings2,
  Zap,
} from 'lucide-react';
import type { Devices, Mode } from '../../types';
import type { DeviceKey } from '../../hooks/useCapture';
import type { Backend, Settings } from '../../lib/settings';
import { IconButton, SectionLabel, TextButton } from '../atoms';
import {
  CaptureButton,
  Collapsible,
  DeviceSelect,
  StreamButton,
  ToggleField,
} from '../molecules';
import type { PanelSide } from '../templates/MainLayout';
import { AdvancedSettings } from './AdvancedSettings';
import { EffectSettings } from './EffectSettings';
import { useT } from '../../i18n';

type Props = {
  side: PanelSide;
  onCollapse(): void;
  settings: Settings;
  change<K extends keyof Settings>(key: K, value: Settings[K]): void;
  devices: Devices;
  modes: Mode[];
  native: boolean;
  running: boolean;
  busy: boolean;
  canStart: boolean;
  needsPermission: boolean;
  presetPicker: ReactNode;
  /** Party only: the capture type select (and its sources), shown first in "Input & output". */
  sourcePicker?: ReactNode;
  /** With a screen or window chosen, the capture device fields don't apply. */
  devicesHidden?: boolean;
  onRefresh(): void;
  onPermit(): void;
  onSelectDevice(key: DeviceKey, value: string): void;
  onBackendChange(backend: Backend): void;
  onStart(): void;
  onStop(): void;
  /**
   * Gaming Party: the footer starts and stops the transmission instead of a local-only capture.
   * Omitted on the standalone capture screen.
   */
  transmit?: {
    streaming: boolean;
    busy: boolean;
    canStart: boolean;
    blocked?: string;
    onStart(): void;
    onStop(): void;
  };
};

export function SettingsPanel({
  side,
  onCollapse,
  settings: s,
  change,
  devices,
  modes,
  native,
  running,
  busy,
  canStart,
  needsPermission,
  presetPicker,
  sourcePicker,
  devicesHidden,
  onRefresh,
  onPermit,
  onSelectDevice,
  onBackendChange,
  onStart,
  onStop,
  transmit,
}: Props) {
  const locked = running || busy;
  const t = useT().settings;
  return (
    <aside className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[14px] border border-[#2a3542] bg-[#121921] immersive:hidden max-[750px]:overflow-visible">
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-[18px] pb-2 [scrollbar-color:#2a3846_transparent] [scrollbar-width:thin] min-[1800px]:px-6 min-[1800px]:pt-[22px] max-[750px]:overflow-visible">
        <div className="mb-[18px] flex items-center gap-[9px] text-[#c3d0dd]">
          <Settings2 size={18} />
          <h2 className="min-w-0 flex-1 truncate text-[16px] font-[550] min-[1800px]:text-[17px]">
            {t.title}
          </h2>
          <IconButton
            size="sm"
            label={t.refresh}
            disabled={locked}
            onClick={onRefresh}
          >
            <RefreshCw size={16} />
          </IconButton>
          <IconButton size="sm" label={t.collapse} onClick={onCollapse}>
            {side === 'right' ? (
              <PanelRightClose size={16} />
            ) : (
              <PanelLeftClose size={16} />
            )}
          </IconButton>
        </div>
        <SectionLabel icon={<Bookmark size={14} />}>{t.preset}</SectionLabel>
        {presetPicker}
        <Collapsible icon={<Cable size={14} />} title={t.io} defaultOpen>
          {sourcePicker}
          {!devicesHidden && (
            <>
              <DeviceSelect
                label={t.card}
                value={s.video}
                items={devices.video}
                placeholder={t.selectDevice}
                disabled={locked}
                onChange={(v) => onSelectDevice('video', v)}
              />
              {needsPermission && (
                <TextButton onClick={onPermit}>
                  {t.permit} <ArrowUpRight size={13} />
                </TextButton>
              )}
              <SectionLabel icon={<AudioLines size={14} />}>
                {t.audio}
              </SectionLabel>
              <DeviceSelect
                label={t.audioInput}
                value={s.audio}
                items={devices.audio}
                placeholder={t.noAudio}
                disabled={locked}
                onChange={(v) => onSelectDevice('audio', v)}
              />
              <DeviceSelect
                label={t.output}
                value={s.output}
                items={devices.output}
                placeholder={t.systemDefault}
                disabled={locked}
                onChange={(v) => onSelectDevice('output', v)}
              />
            </>
          )}
        </Collapsible>
        <EffectSettings settings={s} change={change} />{' '}
        <AdvancedSettings
          settings={s}
          change={change}
          modes={modes}
          native={native}
          locked={locked}
          onBackendChange={onBackendChange}
        />
      </div>
      {(!devicesHidden || running || busy || transmit) && (
        <div className="flex-none border-t border-line-soft bg-[#121921] px-5 py-3.5 min-[1800px]:px-6 min-[1800px]:py-4">
          {(!devicesHidden || running || busy) && (
            <ToggleField
              label={t.autoConnect}
              hint={t.autoConnectHint}
              checked={s.auto}
              onChange={(v) => change('auto', v)}
            />
          )}
          {transmit ? (
            <StreamButton
              block
              streaming={transmit.streaming}
              busy={transmit.busy}
              disabled={!transmit.streaming && !transmit.canStart}
              title={transmit.blocked}
              onStart={transmit.onStart}
              onStop={transmit.onStop}
            />
          ) : (
            <>
              <CaptureButton
                running={running}
                busy={busy}
                canStart={canStart}
                onStart={onStart}
                onStop={onStop}
              />
              <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[12px] text-[#8494a5]">
                <Zap size={13} /> {t.local}
              </p>
            </>
          )}
        </div>
      )}
    </aside>
  );
}
