import { describe, expect, it } from 'vitest';
import { slotQuality, stageSlots } from '@coopseat/ui/party-layout';
import {
  allocateBitrates,
  AUDIO_KBPS,
  BitrateAdapter,
  MIN_VIDEO_KBPS,
  VIDEO_PROFILES,
  withStereoOpus,
  type OutboundSample,
} from '@coopseat/ui/webrtc';

describe('allocateBitrates', () => {
  it('gives everyone the full profile when the budget allows', () => {
    expect(allocateBitrates({ a: 'high', b: 'low' })).toEqual({ a: VIDEO_PROFILES.high.maxKbps, b: VIDEO_PROFILES.low.maxKbps });
  });

  it('skips paused viewers and splits a tight budget, never below the floor', () => {
    const out = allocateBitrates({ a: 'high', b: 'high', c: 'paused' }, 6000);
    expect(out).toEqual({ a: (6000 - 2 * AUDIO_KBPS) / 2, b: (6000 - 2 * AUDIO_KBPS) / 2 });
    const starved = allocateBitrates({ a: 'high', b: 'low', c: 'low' }, 500);
    expect(Object.values(starved).every((kbps) => kbps === MIN_VIDEO_KBPS)).toBe(true);
  });

  it('allocates nothing when nobody is watching', () => {
    expect(allocateBitrates({ a: 'paused' })).toEqual({});
  });
});

describe('BitrateAdapter', () => {
  let t = 0;
  const sample = (over: Partial<OutboundSample> = {}, sent = 1000, lost = 0): OutboundSample => ({
    at: (t += 2000),
    bytesSent: 0,
    packetsSent: sent,
    packetsLost: lost,
    rttMs: 40,
    availableKbps: null,
    limitation: null,
    fps: 60,
    ...over,
  });

  it('backs off on loss and recovers slowly up to the ceiling', () => {
    const adapter = new BitrateAdapter(4000);
    adapter.update(sample({}, 0, 0));
    expect(adapter.update(sample({}, 1000, 100))).toBe(3000);
    expect(adapter.update(sample({}, 2000, 100))).toBeNull();
    adapter.update(sample({}, 3000, 100));
    expect(adapter.update(sample({}, 4000, 100))).toBe(Math.ceil(3000 * 1.1));
    for (let i = 0; i < 20; i++) adapter.update(sample({}, 5000 + i * 1000, 100));
    expect(adapter.kbps).toBe(4000);
  });

  it('reacts to RTT and bandwidth limitation and respects the available estimate', () => {
    const adapter = new BitrateAdapter(4000);
    adapter.update(sample());
    expect(adapter.update(sample({ rttMs: 500 }))).toBe(3000);
    expect(adapter.update(sample({ limitation: 'bandwidth' }))).toBe(2250);
    expect(adapter.update(sample({ availableKbps: 1000 }))).toBe(900);
    for (let i = 0; i < 10; i++) adapter.update(sample({ limitation: 'bandwidth' }));
    expect(adapter.kbps).toBe(MIN_VIDEO_KBPS);
  });
});

describe('withStereoOpus', () => {
  const sdp = ['m=audio 9 UDP/TLS/RTP/SAVPF 111', 'a=rtpmap:111 opus/48000/2', 'a=fmtp:111 minptime=10;useinbandfec=1;stereo=0', ''].join('\r\n');

  it('requests stereo at 128 kbps while keeping the other parameters', () => {
    expect(withStereoOpus(sdp)).toContain('a=fmtp:111 minptime=10;useinbandfec=1;stereo=1;sprop-stereo=1;maxaveragebitrate=128000');
  });

  it('adds an fmtp line when missing and leaves SDP without Opus alone', () => {
    const noFmtp = sdp.replace(/a=fmtp[^\r]*\r\n/, '');
    expect(withStereoOpus(noFmtp)).toContain('a=rtpmap:111 opus/48000/2\r\na=fmtp:111 stereo=1;');
    expect(withStereoOpus('m=video 9 UDP/TLS/RTP/SAVPF 96\r\n')).toBe('m=video 9 UDP/TLS/RTP/SAVPF 96\r\n');
  });
});

describe('stage layouts', () => {
  const streamers = ['b', 'owner', 'c', 'd'];

  it('puts the owner first and honours the focused streamer', () => {
    expect(stageSlots('stage', streamers, null, 'owner')).toEqual({ main: ['owner'], strip: ['b', 'c', 'd'], hidden: [] });
    expect(stageSlots('stage', streamers, 'c', 'owner').main).toEqual(['c']);
    expect(stageSlots('stage', streamers, 'gone', 'owner').main).toEqual(['owner']);
  });

  it('hides (and so disconnects) streams the layout has no tile for', () => {
    expect(stageSlots('focus', streamers, null, 'owner').hidden).toEqual(['b', 'c', 'd']);
    expect(stageSlots('split', streamers, null, 'owner')).toEqual({ main: ['owner', 'b'], strip: [], hidden: ['c', 'd'] });
    expect(stageSlots('grid', streamers, null, 'owner').hidden).toEqual([]);
    expect(stageSlots('grid', [], null, 'owner')).toEqual({ main: [], strip: [], hidden: [] });
  });

  it('asks for the low layer on small or crowded tiles and nothing for hidden ones', () => {
    expect(slotQuality('stage', stageSlots('stage', streamers, null, 'owner'))).toEqual({ owner: 'high', b: 'low', c: 'low', d: 'low' });
    expect(slotQuality('grid', stageSlots('grid', ['owner', 'b'], null, 'owner'))).toEqual({ owner: 'high', b: 'high' });
    expect(Object.values(slotQuality('grid', stageSlots('grid', streamers, null, 'owner')))).toEqual(['low', 'low', 'low', 'low']);
    expect(slotQuality('focus', stageSlots('focus', ['owner', 'b'], null, 'owner'))).toEqual({ owner: 'high', b: null });
  });
});
