import type { Layout, Quality } from '../../party/protocol';

export type StageSlots = { main: string[]; strip: string[]; hidden: string[] };

/**
 * Which streamers get a tile in each layout. Anything in `hidden` is paused at once and disconnected
 * shortly after, so viewers never download streams they can't see.
 * - stage: one large tile plus a strip of small ones
 * - grid: everyone the same size
 * - split: two large tiles side by side
 * - focus: a single tile, nothing else
 */
export function stageSlots(
  layout: Layout,
  streamers: string[],
  focus: string | null,
  ownerId: string,
): StageSlots {
  const ordered = [...streamers].sort((a, b) =>
    a === ownerId ? -1 : b === ownerId ? 1 : 0,
  );
  const first = focus && ordered.includes(focus) ? focus : ordered[0];
  if (!first) return { main: [], strip: [], hidden: [] };
  const rest = ordered.filter((id) => id !== first);
  switch (layout) {
    case 'grid':
      return { main: ordered, strip: [], hidden: [] };
    case 'split':
      return {
        main: [first, ...rest.slice(0, 1)],
        strip: [],
        hidden: rest.slice(1),
      };
    case 'focus':
      return { main: [first], strip: [], hidden: rest };
    default:
      return { main: [first], strip: rest, hidden: [] };
  }
}

/** Large tiles get the high layer; small or crowded tiles the low one, which saves the streamer's upload. */
export function slotQuality(
  layout: Layout,
  slots: StageSlots,
): Record<string, Exclude<Quality, 'paused'> | null> {
  const out: Record<string, Exclude<Quality, 'paused'> | null> = {};
  const crowded = layout === 'grid' && slots.main.length > 2;
  for (const id of slots.main) out[id] = crowded ? 'low' : 'high';
  for (const id of slots.strip) out[id] = 'low';
  for (const id of slots.hidden) out[id] = null;
  return out;
}
