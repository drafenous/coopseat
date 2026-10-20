import { describe, expect, it } from 'vitest';
import {
  placeIntoSlot,
  removeFromGrid,
  reorderGridSlots,
  slotQuality,
  stageSlots,
} from '@coopseat/ui/party-layout';
import {
  allocateBitrates,
  AUDIO_KBPS,
  BitrateAdapter,
  MIN_VIDEO_KBPS,
  senderLimits,
  sendScale,
  takeFrame,
  VIDEO_PROFILES,
  withStereoOpus,
  type OutboundSample,
} from '@coopseat/ui/webrtc';

describe('allocateBitrates', () => {
  it('gives everyone the full profile when the budget allows', () => {
    expect(allocateBitrates({ a: 'high', b: 'low' })).toEqual({
      a: VIDEO_PROFILES.high.maxKbps,
      b: VIDEO_PROFILES.low.maxKbps,
    });
  });

  it('skips paused viewers and splits a tight budget, never below the floor', () => {
    const out = allocateBitrates({ a: 'high', b: 'high', c: 'paused' }, 6000);
    expect(out).toEqual({
      a: (6000 - 2 * AUDIO_KBPS) / 2,
      b: (6000 - 2 * AUDIO_KBPS) / 2,
    });
    const starved = allocateBitrates({ a: 'high', b: 'low', c: 'low' }, 500);
    expect(
      Object.values(starved).every((kbps) => kbps === MIN_VIDEO_KBPS),
    ).toBe(true);
  });

  it('allocates nothing when nobody is watching', () => {
    expect(allocateBitrates({ a: 'paused' })).toEqual({});
  });
});

describe('BitrateAdapter', () => {
  let t = 0;
  const sample = (
    over: Partial<OutboundSample> = {},
    sent = 1000,
    lost = 0,
  ): OutboundSample => ({
    at: (t += 2000),
    bytesSent: 0,
    packetsSent: sent,
    packetsLost: lost,
    rttMs: 40,
    availableKbps: null,
    limitation: null,
    fps: 60,
    width: null,
    height: null,
    ...over,
  });

  it('backs off on loss and recovers slowly up to the ceiling', () => {
    const adapter = new BitrateAdapter(4000);
    adapter.update(sample({}, 0, 0));
    expect(adapter.update(sample({}, 1000, 100))).toBe(3000);
    expect(adapter.update(sample({}, 2000, 100))).toBeNull();
    adapter.update(sample({}, 3000, 100));
    expect(adapter.update(sample({}, 4000, 100))).toBe(Math.ceil(3000 * 1.1));
    for (let i = 0; i < 20; i++)
      adapter.update(sample({}, 5000 + i * 1000, 100));
    expect(adapter.kbps).toBe(4000);
  });

  it('backs off on RTT and only cuts for a real hole in the bandwidth estimate', () => {
    const adapter = new BitrateAdapter(4000);
    adapter.update(sample());
    expect(adapter.update(sample({ rttMs: 500 }))).toBe(3000);
    // The encoder reports this while sitting on the configured cap. That is not loss.
    expect(adapter.update(sample({ limitation: 'bandwidth' }))).toBeNull();
    expect(adapter.kbps).toBe(3000);
    expect(adapter.update(sample({ availableKbps: 1000 }))).toBe(900);
    adapter.update(sample({ availableKbps: 20000, limitation: 'bandwidth' }));
    adapter.update(sample({ availableKbps: 20000, limitation: 'bandwidth' }));
    expect(
      adapter.update(sample({ availableKbps: 20000, limitation: 'bandwidth' })),
    ).toBe(Math.ceil(900 * 1.1));
    const starved = new BitrateAdapter(4000);
    starved.update(sample());
    for (let i = 0; i < 5; i++) starved.update(sample({ availableKbps: 200 }));
    expect(starved.kbps).toBe(MIN_VIDEO_KBPS);
  });

  it('keeps the bitrate cap still while the estimate only wobbles', () => {
    const adapter = new BitrateAdapter(6000);
    adapter.update(sample());
    for (const availableKbps of [5000, 4200, 5600, 4000, 5400])
      expect(adapter.update(sample({ availableKbps }))).toBeNull();
    expect(adapter.kbps).toBe(6000);
  });
});

describe('sendScale', () => {
  it('fits 1080p and a near-1080 window inside 720p, and leaves a smaller frame', () => {
    expect(sendScale(1920, 1080)).toBe(1.5);
    expect(sendScale(1920, 1032)).toBe(1.5);
    expect(sendScale(3840, 2160)).toBe(3);
    expect(sendScale(1280, 720)).toBe(1);
    expect(sendScale(800, 600)).toBe(1);
    expect(sendScale(0, 0)).toBe(1);
  });
});

describe('takeFrame', () => {
  it('keeps every other frame of a 60fps source', () => {
    let due = 0;
    const kept: number[] = [];
    for (let i = 0; i < 6; i++) {
      const ts = i * 16_667;
      const next = takeFrame(ts, due);
      due = next.dueUs;
      if (next.emit) kept.push(ts);
    }
    expect(kept).toEqual([0, 16_667 * 2, 16_667 * 4]);
  });

  it('emits a dumped burst once and does not backfill the gap', () => {
    let due = 0;
    const kept: number[] = [];
    for (const ts of [100_000, 101_000, 102_000, 103_000, 150_000]) {
      const next = takeFrame(ts, due);
      due = next.dueUs;
      if (next.emit) kept.push(ts);
    }
    expect(kept).toEqual([100_000, 150_000]);
  });
});

describe('senderLimits', () => {
  it('caps a browser sender at 30 fps and 4500 kbps', () => {
    expect(senderLimits('high', 6000, true)).toMatchObject({
      maxKbps: 4500,
      maxFramerate: 30,
      degradationPreference: 'maintain-framerate',
    });
    expect(senderLimits('low', 6000, true).maxKbps).toBe(
      VIDEO_PROFILES.low.maxKbps,
    );
  });

  it('leaves the desktop profile alone', () => {
    expect(senderLimits('high', 6000, false)).toMatchObject({
      maxKbps: 6000,
      maxFramerate: 60,
      degradationPreference: 'balanced',
    });
  });
});

describe('withStereoOpus', () => {
  const sdp = [
    'm=audio 9 UDP/TLS/RTP/SAVPF 111',
    'a=rtpmap:111 opus/48000/2',
    'a=fmtp:111 minptime=10;useinbandfec=1;stereo=0',
    '',
  ].join('\r\n');

  it('requests stereo at 128 kbps while keeping the other parameters', () => {
    expect(withStereoOpus(sdp)).toContain(
      'a=fmtp:111 minptime=10;useinbandfec=1;stereo=1;sprop-stereo=1;maxaveragebitrate=128000',
    );
  });

  it('adds an fmtp line when missing and leaves SDP without Opus alone', () => {
    const noFmtp = sdp.replace(/a=fmtp[^\r]*\r\n/, '');
    expect(withStereoOpus(noFmtp)).toContain(
      'a=rtpmap:111 opus/48000/2\r\na=fmtp:111 stereo=1;',
    );
    expect(withStereoOpus('m=video 9 UDP/TLS/RTP/SAVPF 96\r\n')).toBe(
      'm=video 9 UDP/TLS/RTP/SAVPF 96\r\n',
    );
  });
});

describe('stage layouts', () => {
  const streamers = ['b', 'owner', 'c', 'd'];

  it('puts the owner first and honours the focused streamer', () => {
    expect(stageSlots('stage', streamers, null, 'owner')).toEqual({
      main: ['owner'],
      strip: ['b', 'c', 'd'],
      hidden: [],
    });
    expect(stageSlots('stage', streamers, 'c', 'owner').main).toEqual(['c']);
    expect(stageSlots('stage', streamers, 'gone', 'owner').main).toEqual([
      'owner',
    ]);
  });

  it('shows everyone in the grid by default and pads 3 into a 2x2 with an empty cell', () => {
    expect(stageSlots('grid', streamers, null, 'owner').hidden).toEqual([]);
    expect(stageSlots('grid', [], null, 'owner')).toEqual({
      main: [],
      strip: [],
      hidden: [],
    });
    const three = stageSlots('grid', ['owner', 'b', 'c'], null, 'owner');
    expect(three.main).toEqual(['owner', 'b', 'c', null]);
    expect(three.strip).toEqual([]);
  });

  it('keeps removed streamers on the strip (paused) in grid mode', () => {
    const slots = stageSlots(
      'grid',
      streamers,
      null,
      'owner',
      ['owner', 'b', null, 'c'],
    );
    expect(slots.main).toEqual(['owner', 'b', null, 'c']);
    expect(slots.strip).toEqual(['d']);
    expect(slots.hidden).toEqual(['d']);
  });

  it('reorders, places and removes grid slots', () => {
    expect(reorderGridSlots(['a', 'b', 'c', null], 0, 2)).toEqual([
      'b',
      'c',
      'a',
      null,
    ]);
    expect(placeIntoSlot(['a', null, 'b'], 'c', 1)).toEqual([
      'a',
      'c',
      'b',
      null,
    ]);
    expect(placeIntoSlot(['a', 'b'], 'c', 0)).toEqual(['c', 'b']);
    expect(removeFromGrid(['a', 'b', 'c', null], 'b')).toEqual(['a', 'c']);
    expect(removeFromGrid(['a', 'b', 'c'], 'c')).toEqual(['a', 'b']);
  });

  it('asks for the low layer on small or crowded tiles and nothing for hidden ones', () => {
    expect(
      slotQuality('stage', stageSlots('stage', streamers, null, 'owner')),
    ).toEqual({ owner: 'high', b: 'low', c: 'low', d: 'low' });
    expect(
      slotQuality('grid', stageSlots('grid', ['owner', 'b'], null, 'owner')),
    ).toEqual({ owner: 'high', b: 'high' });
    expect(
      Object.values(
        slotQuality('grid', stageSlots('grid', streamers, null, 'owner')),
      ),
    ).toEqual(['low', 'low', 'low', 'low']);
    expect(
      slotQuality(
        'grid',
        stageSlots('grid', streamers, null, 'owner', ['owner', 'b']),
      ),
    ).toEqual({ owner: 'high', b: 'high', c: null, d: null });
  });
});
