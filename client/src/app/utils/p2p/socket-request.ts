import { DiscoveryMode } from "@/utils/p2p/discovery-mode";

export enum SocketRequestType {
    CONNECT = "CONNECT",
    OFFER = "OFFER",
    ANSWER = "ANSWER",
    PEER_CONNECT = "PEER_CONNECT",
    PEER_RECONNECT = "PEER_RECONNECT",
    ICE_CANDIDATE = "ICE_CANDIDATE",
    END_OF_ICE_CANDIDATES = "END_OF_ICE_CANDIDATES"
}

interface SocketRequest {
    type: SocketRequestType;
}

export interface SocketConnectRequest extends SocketRequest {
    data: {
        name: string;
        authToken: string | null;
        discoveryMode: DiscoveryMode;
    };
}

export interface SocketPeerConnectRequest extends SocketRequest {
    data: {
        connectionId: string;
    };
}

export interface SocketPeerReconnectRequest extends SocketRequest {
    data: {
        peerId: string;
    }
}
