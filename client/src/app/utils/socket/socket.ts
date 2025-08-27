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
            this.connectPersistedIds(); // TODO: Can't be here
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
                    return data.isConnected
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
        const peerId: string | null = this.session.peerId;

        if (!name || !peerId) {
            throw new Error("Name or peer ID is not provided");
        }

        this.sendMessage<ConnectRequest>({
            type: RequestType.CONNECT,
            data: {
                name,
                peerId,
                discoverability: this.session.discoverability,
            },
        });
    }

    public connectPeer(connectionId: string): void {
        // TODO: Add an interface
        // TODO: Exclude IDs that already exists in pcs
        this.sendMessage<any>({
            type: RequestType.PEER_CONNECT,
            data: {
                connectionId,
            },
        });
    }

    public reestablishConnection(peerId: string): void {
        // TODO: Add an interface
        this.sendMessage<any>({
            type: RequestType.PEER_RECONNECT,
            data: {
                peerId,
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

        if (this.isConnectionEstablished(data.peerId)) {
            return;
        }

        const offer: string = await this.rtc.createOffer(data.peerId, data.name, data.device, data.connectionType);

        this.sendMessage({
            type: RequestType.OFFER,
            data: {
                offer: offer,
                peerId: data.peerId,
                connectionType: data.connectionType,
            },
        });
    }

    // TODO: Add an interface
    private async handleAnswer(data: any): Promise<void> {
        console.log("[WebSocket] Received offer from peer and creating an answer", data);
        const answer: string = await this.rtc.createAnswer(data.peerId, data.offer, data.name, data.device, data.connectionType);

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
        console.log("[WebSocket] Direct connection succeed", data);
    }

    // TODO: Add an interface
    private handlePeerConnectFailed(data: any): void {
        console.log("[WebSocket] Direct connection failed", data);
    }

    private connectPersistedIds(): void {
        for (const peerId of this.session.connectedPeerIds) {
            if (!this.rtc.pcs().get(peerId)) {
                this.reestablishConnection(peerId);
            }
        }
    }

    private isConnectionEstablished(peerId: string): boolean {
        console.warn(`[WebSocket] Connection has already been established with peer ID ${peerId}`);
        return !!this.rtc.pcs().get(peerId);
    }
}
