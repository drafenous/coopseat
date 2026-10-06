import { env } from './env';
import { ApiError } from './http';

export type IceServer = {
  urls: string[];
  username?: string;
  credential?: string;
};

export const TURN_TTL_SECONDS = 4 * 60 * 60;

/** Free Cloudflare STUN, handed out when the relay is denied so direct (P2P) connections still work. */
export const STUN_ONLY: IceServer[] = [
  { urls: ['stun:stun.cloudflare.com:3478'] },
];

/** Short-lived Cloudflare Realtime TURN credentials, ready for `new RTCPeerConnection({ iceServers })`. */
export async function createIceServers(
  ttl = TURN_TTL_SECONDS,
): Promise<IceServer[]> {
  const res = await fetch(
    `https://rtc.live.cloudflare.com/v1/turn/keys/${env.turnKeyId}/credentials/generate-ice-servers`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.turnApiToken}`,
        'Content-Type': 'application/json',
      },
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

/** The TURN username Cloudflare issued, needed later to revoke the credential. */
export function turnUsername(iceServers: IceServer[]): string | null {
  return iceServers.find((s) => s.username)?.username ?? null;
}
