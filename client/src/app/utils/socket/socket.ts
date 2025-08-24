import { inject, Injectable } from "@angular/core";
import { RTC } from "@/utils/rtc/rtc";
import { ConnectRequest, Discoverability, RequestType, ResponseType } from "@/utils/socket/socket-interface";
import { SessionStorage } from "@/utils/storage/session-storage";
import { LocalStorage } from "@/utils/storage/local-storage";
import { NotificationService } from "@/ui/notification/notification.service";
import { Session } from "@/utils/session/session";

@Injectable({
    providedIn: "root",
})
export class Socket {
    private static readonly RECONNECT_DELAY = 2000;
    private static readonly CONNECT_TIMEOUT = 5000;

    private ws!: WebSocket;
    private readonly rtc: RTC = inject<RTC>(RTC);
    private readonly session: Session = inject(Session);
    private readonly notification: NotificationService = inject<NotificationService>(NotificationService);

    public init(): void {
        this.ws = new WebSocket("ws://localhost:8080/ws");
        console.log("[WebSocket] Initialize connection");

        const connectTimeout = setTimeout(() => {
            console.warn("[WebSocket] Connection timeout, closing...");
            this.ws?.close();
        }, Socket.CONNECT_TIMEOUT);

        this.ws.onopen = (): void => {
            clearTimeout(connectTimeout);
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
                    this.notification.show({ message: "Connected to P2P network" });
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
                    console.log("[WebSocket] Message received: ", data);
                    break;
            }
        };

        this.ws.onclose = (e: CloseEvent): void => {
            clearTimeout(connectTimeout);
            console.warn("[WebSocket] Connection closed, retrying in", Socket.RECONNECT_DELAY, "ms");
            setTimeout(this.init, Socket.RECONNECT_DELAY);
        };

        this.ws.onerror = (e: Event): void => {
            console.log("[WebSocket] Connection error", e);
            this.ws.close();
        };
    }

    public sendMessage<T>(message: T): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }

    private connectWebSocket(): void {
        const name: string | null = this.session.name;
        const discoverability: Discoverability = this.session.discoverability;

        if (!name) {
            throw new Error("Name is not provided");
        }

        this.sendMessage<ConnectRequest>({
            type: RequestType.CONNECT,
            data: {
                name,
                discoverability,
            },
        });
    }
}
