export enum RequestType {
    CONNECT = "CONNECT",
    OFFER = "OFFER",
    ANSWER = "ANSWER",
    PEER_CONNECT = "PEER_CONNECT",
    PEER_RECONNECT = "PEER_RECONNECT",
    CHANGE_SETTINGS = "CHANGE_SETTINGS",
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
    HIDDEN = "HIDDEN",
    NETWORK = "NETWORK"
}

export interface ConnectRequest {
    type: RequestType,
    data: {
        name: string;
        peerId: string;
        discoverability: Discoverability;
    }
}
