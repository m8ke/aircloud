import { IceServer } from "@/utils/session/session";
import { DiscoveryMode } from "@/utils/p2p/discovery-mode";

export enum SocketResponseType {
    CONNECT = "CONNECT",
    DISCONNECT = "DISCONNECT",
    PING_PONG = "PING_PONG",
    OFFER = "OFFER",
    ANSWER = "ANSWER",
    APPROVE_ANSWER = "APPROVE_ANSWER",
    PEER_CONNECT = "PEER_CONNECT",
    ICE_CANDIDATE = "ICE_CANDIDATE",
    END_OF_ICE_CANDIDATES = "END_OF_ICE_CANDIDATES",
}

interface SocketResponse {
    type: SocketResponseType;
}

export interface SocketConnect extends SocketResponse {
    peerId: string;
    authToken: string;
    connectionId: string;
    iceServers: IceServer[];
}

export interface SocketDisconnect extends SocketResponse {
    peerId: string;
}

export interface SocketOffer extends SocketResponse {
    peerId: string;
    name: string;
    device: string;
    discoveryMode: DiscoveryMode;
}

export interface SocketPingPong extends SocketResponse {
    authToken: string;
    iceServers: IceServer[];
}

export interface SocketAnswer extends SocketResponse {
    peerId: string;
    offer: RTCSessionDescription;
    name: string;
    device: string;
    discoveryMode: DiscoveryMode;
}

export interface SocketApproveAnswer extends SocketResponse {
    peerId: string;
    answer: RTCSessionDescription;
}

export interface SocketPeerDirectConnect extends SocketResponse {
    connected: boolean;
    isConnected: boolean;
}

export interface SocketPeerDirectConnectSucceed extends SocketPeerDirectConnect {
    peerId: string;
}

export interface SocketPeerDirectConnectFailed extends SocketPeerDirectConnect {
    peerId: string | null;
}

export interface SocketIceCandidate extends SocketResponse {
    peerId: string;
    candidate: RTCIceCandidateInit;
}

export interface SocketEndOfIceCandidates extends SocketResponse {
    peerId: string;
}
