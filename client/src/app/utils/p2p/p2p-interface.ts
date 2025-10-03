import { DiscoveryMode } from "@/utils/websocket/discovery-mode";
import { SocketRequestType } from "@/utils/websocket/socket-request-type";

export interface ConnectRequest {
    type: SocketRequestType,
    data: {
        name: string;
        authToken: string | null;
        discoveryMode: DiscoveryMode;
    }
}
