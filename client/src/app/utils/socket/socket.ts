import { inject, Injectable } from "@angular/core";

import { Env } from "@/utils/env/env";
import { RTC } from "@/utils/rtc/rtc";
import { Session } from "@/utils/session/session";
import { NotificationService } from "@/ui/notification/notification.service";
import { ConnectRequest, RequestType, ResponseType } from "@/utils/socket/socket-interface";

@Injectable({
    providedIn: "root",
})
export class Socket {
    private static readonly RECONNECT_DELAY = 3000;

    private ws!: WebSocket;
    private readonly env: Env = inject<Env>(Env);
    private readonly rtc: RTC = inject<RTC>(RTC);
    private readonly session: Session = inject<Session>(Session);
    private readonly notification: NotificationService = inject<NotificationService>(NotificationService);

    public init(): void {
        this.ws = new WebSocket(this.env.wsUrl);
        console.log("[WebSocket] Initialize connection");

        this.ws.onopen = (): void => {
            console.log("[WebSocket] Connection opened");
            this.connectWebSocket();
            this.connectPersistedIds();
        };

        // TODO: Share ICE candidates
        this.ws.onmessage = async (event): Promise<void> => {
            const data = JSON.parse(event.data);

            switch (data.type as ResponseType) {
                case ResponseType.CONNECT:
                    return this.handleConnect(data);
                case ResponseType.DISCONNECT:
                    return this.handleDisconnect(data);
                case ResponseType.OFFER:
                    return this.handleOffer(data);
                case ResponseType.ANSWER:
                    return await this.handleAnswer(data);
                case ResponseType.APPROVE_ANSWER:
                    return this.handleApproveAnswer(data);
                case ResponseType.PEER_CONNECT:
                    return data.succeed
                        ? this.handlePeerConnectSucceed(data)
                        : this.handlePeerConnectFailed(data);
                default:
                    console.log("[WebSocket] Unhandled message received", data);
                    break;
            }
        };

        this.ws.onclose = async (e: CloseEvent): Promise<void> => {
            // TODO: Reconnection need improvements to prevent duplications.
            console.warn(`[WebSocket] Connection closed, retrying in ${Socket.RECONNECT_DELAY} ms`);
            await this.delay(Socket.RECONNECT_DELAY);
            this.init();
        };

        this.ws.onerror = (e: Event): void => {
            console.log("[WebSocket] Connection error", e);
            this.ws.close();
        };
    }

    private connectWebSocket(): void {
        const name: string | null = this.session.name;

        if (!name) {
            throw new Error("Name is not provided");
        }

        this.sendMessage<ConnectRequest>({
            type: RequestType.CONNECT,
            data: {
                name,
                discoverability: this.session.discoverability,
            },
        });
    }

    public connectPeer(connectionId: string): void {
        // TODO: Change <any> to specific type
        this.sendMessage<any>({
            type: RequestType.PEER_CONNECT,
            data: {
                connectionId,
            },
        });
    }

    private sendMessage<T>(message: T): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }

    private delay(n: number): Promise<void> {
        return new Promise<void>((resolve): void => {
            setTimeout(resolve, n);
        });
    }

    // TODO: Add an interface
    private handleConnect(data: any): void {
        this.session.peerId = data.peerId;
        this.session.connectionId = data.connectionId;
        this.notification.show({message: "Connected to P2P network"});
    }

    // TODO: Add an interface
    private handleDisconnect(data: any): void {
        this.rtc.closeConnection(data.peerId);
    }

    // TODO: Add an interface
    private async handleOffer(data: any): Promise<void> {
        console.log("[WebSocket] Received offer request from peer", data);
        const offer: string = await this.rtc.createOffer(data.peerId, data.name, data.device);

        this.sendMessage({
            type: RequestType.OFFER,
            data: {
                peerId: data.peerId,
                offer: offer,
            },
        });
    }

    // TODO: Add an interface
    private async handleAnswer(data: any): Promise<void> {
        console.log("[WebSocket] Received offer from peer and creating an answer", data);
        const answer: string = await this.rtc.createAnswer(data.peerId, data.offer, data.name, data.device);

        this.sendMessage({
            type: RequestType.ANSWER,
            data: {
                answer: answer,
                peerId: data.peerId,
            },
        });
    }

    // TODO: Add an interface
    private async handleApproveAnswer(data: any): Promise<void> {
        console.log("[WebSocket] Received and approving an answer from the peer to establish a connection", data);
        await this.rtc.approveAnswer(data.peerId, data.answer);
    }

    // TODO: Add an interface
    private handlePeerConnectSucceed(data: any): void {
        console.log("[WebSocket] Direct connection failed", data);
        this.session.addConnectedPeerId(data.connectionId);
    }

    // TODO: Add an interface
    private handlePeerConnectFailed(data: any): void {
        console.log("[WebSocket] Direct connection failed", data);
        this.session.removeConnectedPeerId(data.connectionId);
    }

    private connectPersistedIds(): void {
        for (const id of this.session.connectedPeerIds) {
            this.connectPeer(id);
        }
    }
}
