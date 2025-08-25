export enum RequestType {
    CONNECT = "CONNECT",
    OFFER = "OFFER",
    ANSWER = "ANSWER",
    CONNECT_PEER = "CONNECT_PEER",
    CHANGE_SETTINGS = "CHANGE_SETTINGS",
}

export enum ResponseType {
    DISCONNECT = "DISCONNECT",
    CONNECT = "CONNECT",
    OFFER = "OFFER",
    ANSWER = "ANSWER",
    APPROVE_ANSWER = "APPROVE_ANSWER",
}

export enum Discoverability {
    HIDDEN = "HIDDEN",
    NETWORK = "NETWORK"
}

export interface ConnectRequest {
    type: RequestType,
    data: {
        name: string;
        connectionId: string | null;
        discoverability: Discoverability;
    }
}
