import {api} from '../api';
import type {Layout,ModPerms,PartyRole} from '../../party/protocol';

export type RoomInfo={owner:string;ownerId:string;defaultLayout:Layout};
export type PartyYou={id:string;nick:string;role:PartyRole;canStream:boolean;streamBlocked:boolean;chat:boolean;mod:ModPerms|null};
export type LiveAccess={state:'admitted'|'pending';token:string;expiresAt:number;sessionId:string;endsAt:number;signalUrl:string|null;you:PartyYou;room:RoomInfo};
export type ClosedAccess=
 |{state:'offline';isOwner:boolean;room:RoomInfo}
 |{state:'password_required';room:RoomInfo}
 |{state:'not_invited';room:RoomInfo}
 |{state:'banned';room:RoomInfo}
 |{state:'unavailable';room:RoomInfo}
 |{state:'disabled';room:RoomInfo}
 |{state:'requirements';missing:string[];room:RoomInfo};
export type Access=LiveAccess|ClosedAccess;
export const isLive=(a:Access):a is LiveAccess=>a.state==='admitted'||a.state==='pending';

export type ModeratorEntry={profileId:string;nickname:string}&ModPerms;
export type RoomView={
 shareUrl:string|null;hasPassword:boolean;requireApproval:boolean;whitelistEnabled:boolean;defaultLayout:Layout;
 maxParticipants:number;maxStreamers:number;enabled:boolean;
 whitelist:{profileId:string;nickname:string;canStream:boolean}[];
 moderators:ModeratorEntry[];
 activeSession:{id:string;startedAt:string}|null;
};
export type BanEntry={profileId:string;nickname:string;reason:string|null;expiresAt:string|null;createdAt:string};
export type ModeratorInput={nickname:string;canKick?:boolean;canBan?:boolean;canStopStreams?:boolean;canApprove?:boolean;canGrantStream?:boolean;canDeleteMessages?:boolean};

const room=(nick:string)=>`/api/party/${encodeURIComponent(nick)}`;

export const partyApi={
 join:(nick:string,body:{password?:string;sessionId?:string}={})=>api<Access>(`${room(nick)}/join`,{method:'POST',body}),
 refresh:(nick:string,sessionId:string)=>api<Access>(`${room(nick)}/token`,{method:'POST',body:{sessionId}}),
 startSession:()=>api<Access>('/api/party/session',{method:'POST',body:{}}),
 endSession:()=>api<{ok:true}>('/api/party/session',{method:'DELETE',body:{}}),
 approve:(nick:string,profileId:string,approve:boolean)=>api<{ok:true}>(`${room(nick)}/approvals`,{method:'POST',body:{profileId,approve}}),
 bans:(nick:string)=>api<{bans:BanEntry[]}>(`${room(nick)}/bans`),
 ban:(nick:string,profileId:string,opts:{reason?:string;hours?:number}={})=>api<{bans:BanEntry[]}>(`${room(nick)}/bans`,{method:'POST',body:{profileId,...opts}}),
 unban:(nick:string,profileId:string)=>api<{bans:BanEntry[]}>(`${room(nick)}/bans`,{method:'DELETE',body:{profileId}}),
 room:()=>api<RoomView>('/api/party/room'),
 updateRoom:(body:{password?:string|null;requireApproval?:boolean;whitelistEnabled?:boolean;defaultLayout?:Layout})=>api<RoomView>('/api/party/room',{method:'PATCH',body}),
 allow:(nickname:string,canStream:boolean)=>api<RoomView>('/api/party/room/whitelist',{method:'POST',body:{nickname,canStream}}),
 disallow:(profileId:string)=>api<RoomView>('/api/party/room/whitelist',{method:'DELETE',body:{profileId}}),
 addModerator:(input:ModeratorInput)=>api<RoomView>('/api/party/room/moderators',{method:'POST',body:input}),
 removeModerator:(profileId:string)=>api<RoomView>('/api/party/room/moderators',{method:'DELETE',body:{profileId}}),
};
