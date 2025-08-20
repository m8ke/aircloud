import { inject, Injectable } from "@angular/core";
import { RTC } from "@/utils/rtc/rtc";
import { ToastService } from "@/ui/toast/toast.service";
import { ConnectRequest, Discoverability, RequestType, ResponseType } from "@/utils/socket/socket-interface";
import { SessionStorage } from "@/utils/storage/session-storage";
import { LocalStorage } from "@/utils/storage/local-storage";

@Injectable({
    providedIn: "root",
})
export class Socket {
    private static readonly RECONNECT_DELAY = 2000; // ms
    private static readonly CONNECT_TIMEOUT = 5000; // ms

    private ws!: WebSocket;
    private readonly rtc: RTC = inject<RTC>(RTC);
    private readonly toast: ToastService = inject<ToastService>(ToastService);
    private readonly sessionStorage: SessionStorage = inject<LocalStorage>(SessionStorage);

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
                case ResponseType.PEER_CONNECTED:
                    this.rtc.myPeerId = data.peerId;
                    this.toast.show("Connected to P2P network");
                    break;
                case ResponseType.PEER_LEFT:
                    this.rtc.closeConnection(data.peerId);
                    break;
                case ResponseType.PEER_OFFER:
                    console.log("[WebSocket] Received offer request from peer", data);
                    const offer = await this.rtc.createOffer(data.peerId, data.name, data.device);
                    this.sendMessage({
                        type: RequestType.PEER_OFFER,
                        data: {
                            peerId: data.peerId,
                            offer: offer.localDescription,
                        },
                    });
                    break;
                case ResponseType.PEER_ANSWER:
                    console.log("[WebSocket] Received offer from peer and creating an answer", data);
                    const answer: string = await this.rtc.createAnswer(data.peerId, data.offer, data.name, data.device);
                    this.sendMessage({
                        type: RequestType.PEER_ANSWER,
                        data: {
                            answer: answer,
                            peerId: data.peerId,
                        },
                    });
                    break;
                case ResponseType.APPROVE_PEER_ANSWER:
                    console.log("[WebSocket] Received and approving an answer from the peer to establish a connection", data);
                    await this.rtc.approveAnswer(data.peerId, data.answer);
                    break;
                default:
                    console.log("[WebSocket] Message received: ", data);
                    break;
            }
        };

        this.ws.onclose = (e): void => {
            clearTimeout(connectTimeout);
            console.warn("[WebSocket] Connection closed, retrying in", Socket.RECONNECT_DELAY, "ms");
            setTimeout(this.init, Socket.RECONNECT_DELAY);
        };

        this.ws.onerror = (e): void => {
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
        this.sendMessage<ConnectRequest>({
            type: RequestType.CONNECT,
            data: {
                name: this.sessionStorage.getItem("name") || "-",
                discoverability: Discoverability.NETWORK,
            },
        });
    }
}
