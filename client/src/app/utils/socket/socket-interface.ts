export enum RequestType {
    CONNECT = "CONNECT",
    PEER_OFFER = "PEER_OFFER",
    PEER_ANSWER = "PEER_ANSWER",
}

export enum ResponseType {
    PEER_OFFER = "PEER_OFFER",
    PEER_ANSWER = "PEER_ANSWER",
    APPROVE_PEER_ANSWER = "APPROVE_PEER_ANSWER"
}

export enum Discoverability {
    HIDDEN = "HIDDEN",
    NETWORK = "NETWORK"
}

export interface ConnectRequest {
    type: RequestType,
    data: {
        name: string;
        discoverability: Discoverability;
    }
}
