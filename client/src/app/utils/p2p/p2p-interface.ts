export enum SocketRequestType {
    CONNECT = "CONNECT",
    OFFER = "OFFER",
    ANSWER = "ANSWER",
    PEER_CONNECT = "PEER_CONNECT",
    PEER_RECONNECT = "PEER_RECONNECT",
}

export enum ResponseType {
    DISCONNECT = "DISCONNECT",
    CONNECT = "CONNECT",
    OFFER = "OFFER",
    ANSWER = "ANSWER",
    APPROVE_ANSWER = "APPROVE_ANSWER",
    PEER_CONNECT = "PEER_CONNECT",
}

export enum Discoverability {
    NETWORK = "NETWORK"
}

export interface ConnectRequest {
    type: SocketRequestType,
    data: {
        name: string;
        peerId: string;
        discoverability: Discoverability;
    }
}
