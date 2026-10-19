import type { Layout, Quality } from '../../party/protocol';

export type StageSlots = {
  /** Ordered main cells; `null` is an empty drop target (e.g. 3-in-2×2). */
  main: (string | null)[];
  strip: string[];
  hidden: string[];
};

export type SplitOrientation = 'horizontal' | 'vertical';

/** Map legacy / unknown values to the two supported layouts. */
export function coerceLayout(v: string | null | undefined): Layout {
  return v === 'grid' ? 'grid' : 'stage';
}

/**
 * With 3 occupied tiles, keep a single empty cell (2×2). Otherwise drop empties
 * and return only occupied ids in order.
 */
export function ensureGridShape(slots: (string | null)[]): (string | null)[] {
  const seen = new Set<string>();
  const occupied: string[] = [];
  let emptyAt: number | null = null;
  for (const s of slots) {
    if (s == null) {
      if (emptyAt === null) emptyAt = occupied.length;
      continue;
    }
    if (seen.has(s)) continue;
    seen.add(s);
    occupied.push(s);
  }
  if (occupied.length === 3) {
    const out: (string | null)[] = [...occupied];
    const idx =
      emptyAt === null ? 3 : Math.max(0, Math.min(emptyAt, occupied.length));
    out.splice(idx, 0, null);
    return out;
  }
  return occupied;
}

/** Keep order, drop left streamers, append new ones (owner first among newcomers). */
export function syncGridSlots(
  prev: (string | null)[],
  streamers: string[],
  ownerId: string,
): (string | null)[] {
  const live = new Set(streamers);
  const kept = prev.filter((s) => s == null || live.has(s));
  const present = new Set(
    kept.filter((s): s is string => typeof s === 'string'),
  );
  const ordered = [...streamers].sort((a, b) =>
    a === ownerId ? -1 : b === ownerId ? 1 : a.localeCompare(b),
  );
  const next = [...kept];
  for (const id of ordered) {
    if (!present.has(id)) next.push(id);
  }
  return ensureGridShape(next);
}

export function reorderGridSlots(
  slots: (string | null)[],
  fromIndex: number,
  toIndex: number,
): (string | null)[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= slots.length ||
    toIndex >= slots.length
  )
    return slots;
  const next = [...slots];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item ?? null);
  return ensureGridShape(next);
}

/** Place `sourceId` into `toIndex` (from grid or strip). Swap if the cell is occupied. */
export function placeIntoSlot(
  slots: (string | null)[],
  sourceId: string,
  toIndex: number,
): (string | null)[] {
  if (toIndex < 0 || toIndex >= slots.length) return slots;
  const next = [...slots];
  const fromIndex = next.indexOf(sourceId);
  const target = next[toIndex];
  if (fromIndex === toIndex) return slots;
  if (fromIndex >= 0) {
    next[fromIndex] = target ?? null;
    next[toIndex] = sourceId;
    return ensureGridShape(next);
  }
  // From strip: write into the cell; displaced occupant leaves the grid.
  next[toIndex] = sourceId;
  return ensureGridShape(next);
}

export function removeFromGrid(
  slots: (string | null)[],
  id: string,
): (string | null)[] {
  return ensureGridShape(slots.map((s) => (s === id ? null : s)));
}

/**
 * Which streamers get a tile. Hidden / strip-outside-grid are paused so viewers
 * do not download streams they cannot see.
 * - stage: one large tile + strip of the rest
 * - grid: ordered cells from `gridSlots` (null = empty); strip = not in cells
 */
export function stageSlots(
  layout: Layout,
  streamers: string[],
  focus: string | null,
  ownerId: string,
  gridSlots?: (string | null)[],
): StageSlots {
  const ordered = [...streamers].sort((a, b) =>
    a === ownerId ? -1 : b === ownerId ? 1 : a.localeCompare(b),
  );
  if (layout === 'grid') {
    const cells = ensureGridShape(
      gridSlots && gridSlots.length
        ? gridSlots
        : syncGridSlots([], streamers, ownerId),
    );
    const inMain = new Set(
      cells.filter((id): id is string => typeof id === 'string'),
    );
    const strip = ordered.filter((id) => !inMain.has(id));
    return { main: cells, strip, hidden: strip };
  }
  const first = focus && ordered.includes(focus) ? focus : ordered[0];
  if (!first) return { main: [], strip: [], hidden: [] };
  const rest = ordered.filter((id) => id !== first);
  return { main: [first], strip: rest, hidden: [] };
}

/** Large tiles get high; crowded grid tiles get low; strip outside grid is paused. */
export function slotQuality(
  layout: Layout,
  slots: StageSlots,
): Record<string, Exclude<Quality, 'paused'> | null> {
  const out: Record<string, Exclude<Quality, 'paused'> | null> = {};
  const occupied = slots.main.filter((id): id is string => id != null);
  const crowded = layout === 'grid' && occupied.length > 2;
  for (const id of occupied) out[id] = crowded ? 'low' : 'high';
  if (layout === 'grid') {
    for (const id of slots.strip) out[id] = null;
  } else {
    for (const id of slots.strip) out[id] = 'low';
  }
  for (const id of slots.hidden) out[id] = null;
  return out;
}

/** Column / direction classes for the main grid area. */
export function mainGridClass(
  occupied: number,
  layout: Layout,
  orientation: SplitOrientation,
): string {
  if (layout !== 'grid') return 'grid-cols-1';
  if (occupied <= 1) return 'grid-cols-1';
  if (occupied === 2)
    return orientation === 'vertical'
      ? 'grid-cols-1 grid-rows-2'
      : 'grid-cols-2 max-[750px]:grid-cols-1';
  if (occupied === 3) return 'grid-cols-2 grid-rows-2';
  if (occupied <= 4) return 'grid-cols-2';
  if (occupied <= 9) return 'grid-cols-3';
  return 'grid-cols-4';
}
