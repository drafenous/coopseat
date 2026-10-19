import type { NativeEvent } from '../../types';
import type { Backend } from '../../lib/settings';
import type { InboundMetrics, OutboundMetrics } from '../../lib/webrtc';
import { MetricCard } from '../molecules';
import { useT } from '../../i18n';

type StreamMetrics = Pick<
  InboundMetrics,
  'kbps' | 'lossRate' | 'fps' | 'width' | 'height'
>;

type CaptureProps = {
  kind?: 'capture';
  stats: NativeEvent | null;
  backend: Backend;
  running: boolean;
};

type StreamProps = {
  kind: 'stream';
  metrics: StreamMetrics | OutboundMetrics | null;
  active: boolean;
};

export function MetricsBar(props: CaptureProps | StreamProps) {
  const t = useT().metrics;
  if (props.kind === 'stream') {
    const m = props.metrics;
    return (
      <section className="mt-[clamp(12px,1.8vh,20px)] grid grid-cols-3 rounded-xl border border-[#2a3542] bg-[#0e151d] py-4 immersive:hidden">
        <MetricCard
          label={t.signal}
          value={m?.width && m?.height ? `${m.width} × ${m.height}` : '—'}
          detail={
            m
              ? `${Math.round(m.kbps)} kbps`
              : props.active
                ? t.waiting
                : t.streamStartToSee
          }
        />
        <MetricCard
          label={t.fps(false)}
          value={m?.fps != null ? m.fps.toFixed(1) : '—'}
          detail={t.fpsDetail}
        />
        <MetricCard
          label={t.loss}
          value={m ? `${Math.round(m.lossRate * 1000) / 10}%` : '—'}
          detail={t.lossDetail}
        />
      </section>
    );
  }
  const { stats, backend, running } = props;
  return (
    <section className="mt-[clamp(12px,1.8vh,20px)] grid grid-cols-3 rounded-xl border border-[#2a3542] bg-[#0e151d] py-4 immersive:hidden">
      <MetricCard
        label={t.signal}
        value={stats?.width ? `${stats.width} × ${stats.height}` : '—'}
        detail={stats?.format || (running ? t.waiting : t.startToSee)}
      />
      <MetricCard
        label={t.fps(backend === 'native')}
        value={stats?.fps?.toFixed(1) || '—'}
        detail={t.fpsDetail}
      />
      <MetricCard
        label={t.dropped}
        value={stats?.dropped ?? '—'}
        detail={t.droppedDetail}
      />
    </section>
  );
}
