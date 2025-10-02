export enum SocketRequestType {
    CONNECT = "CONNECT",
    OFFER = "OFFER",
    ANSWER = "ANSWER",
    PEER_CONNECT = "PEER_CONNECT",
    PEER_RECONNECT = "PEER_RECONNECT",
    ICE_CANDIDATE = "ICE_CANDIDATE",
    END_OF_ICE_CANDIDATES = "END_OF_ICE_CANDIDATES"
}

export enum SocketResponseType {
    DISCONNECT = "DISCONNECT",
    CONNECT = "CONNECT",
    PING_PONG = "PING_PONG",
    OFFER = "OFFER",
    ANSWER = "ANSWER",
    APPROVE_ANSWER = "APPROVE_ANSWER",
    PEER_CONNECT = "PEER_CONNECT",
    ICE_CANDIDATE = "ICE_CANDIDATE",
    END_OF_ICE_CANDIDATES = "END_OF_ICE_CANDIDATES",
}

export enum Discoverability {
    DIRECT = "DIRECT",
    NETWORK = "NETWORK",
}

export interface ConnectRequest {
    type: SocketRequestType,
    data: {
        name: string;
        authToken: string | null;
        discoverability: Discoverability;
    }
}
