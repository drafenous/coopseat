import { env } from './env';
import { ApiError } from './http';

export type IceServer = { urls: string[]; username?: string; credential?: string };

export const TURN_TTL_SECONDS = 4 * 60 * 60;

/** Short-lived Cloudflare Realtime TURN credentials, ready for `new RTCPeerConnection({ iceServers })`. */
export async function createIceServers(ttl = TURN_TTL_SECONDS): Promise<IceServer[]> {
  const res = await fetch(
    `https://rtc.live.cloudflare.com/v1/turn/keys/${env.turnKeyId}/credentials/generate-ice-servers`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.turnApiToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ttl }),
      cache: 'no-store',
    },
  );
  if (!res.ok) {
    console.error('Cloudflare TURN error', res.status);
    throw new ApiError(502, 'turn_unavailable');
  }
  const { iceServers } = (await res.json()) as { iceServers: IceServer[] };
  return iceServers;
}
