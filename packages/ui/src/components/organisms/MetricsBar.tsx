import type { NativeEvent } from '../../types';
import type { Backend } from '../../lib/settings';
import { MetricCard } from '../molecules';
import { useT } from '../../i18n';

export function MetricsBar({
  stats,
  backend,
  running,
}: {
  stats: NativeEvent | null;
  backend: Backend;
  running: boolean;
}) {
  const t = useT().metrics;
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
