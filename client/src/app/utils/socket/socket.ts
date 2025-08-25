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
    private static readonly CONNECT_TIMEOUT = 5000;

    private ws!: WebSocket;
    private readonly env: Env = inject<Env>(Env);
    private readonly rtc: RTC = inject<RTC>(RTC);
    private readonly session: Session = inject(Session);
    private readonly notification: NotificationService = inject<NotificationService>(NotificationService);

    public init(): void {
        this.ws = new WebSocket(this.env.wsUrl);
        console.log("[WebSocket] Initialize connection");

        this.ws.onopen = (): void => {
            console.log("[WebSocket] Connection opened");
            this.connectWebSocket();
        };

        // TODO: Add interfaces to prevent headache
        // TODO: Share ICE candidates
        this.ws.onmessage = async (event): Promise<void> => {
            const data = JSON.parse(event.data);

            switch (data.type as ResponseType) {
                case ResponseType.CONNECT:
                    this.session.peerId = data.peerId;
                    this.notification.show({message: "Connected to P2P network"});
                    break;
                case ResponseType.DISCONNECT:
                    this.rtc.closeConnection(data.peerId);
                    break;
                case ResponseType.OFFER:
                    console.log("[WebSocket] Received offer request from peer", data);
                    const offer: string = await this.rtc.createOffer(data.peerId, data.name, data.device);

                    this.sendMessage({
                        type: RequestType.OFFER,
                        data: {
                            peerId: data.peerId,
                            offer: offer,
                        },
                    });
                    break;
                case ResponseType.ANSWER:
                    console.log("[WebSocket] Received offer from peer and creating an answer", data);
                    const answer: string = await this.rtc.createAnswer(data.peerId, data.offer, data.name, data.device);

                    this.sendMessage({
                        type: RequestType.ANSWER,
                        data: {
                            answer: answer,
                            peerId: data.peerId,
                        },
                    });
                    break;
                case ResponseType.APPROVE_ANSWER:
                    console.log("[WebSocket] Received and approving an answer from the peer to establish a connection", data);
                    await this.rtc.approveAnswer(data.peerId, data.answer);
                    break;
                default:
                    console.log("[WebSocket] Message received:", data);
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
                connectionId: this.session.connectionId,
                discoverability: this.session.discoverability,
            },
        });
    }

    public connectPeer(connectionId: string): void {
        // TODO: Change <any> to specific type
        this.sendMessage<any>({
            type: RequestType.CONNECT_PEER,
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
}
