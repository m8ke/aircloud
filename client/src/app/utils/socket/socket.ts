import { inject, Injectable } from "@angular/core";
import { RTC } from "@/utils/rtc/rtc";
import { ToastService } from "@/ui/toast/toast.service";
import { ConnectRequest, Discoverability, RequestType, ResponseType } from "@/utils/socket/socket-interface";

@Injectable({
    providedIn: "root",
})
export class Socket {
    private readonly ws: WebSocket = new WebSocket("ws://localhost:8080/ws");
    private readonly rtc: RTC = inject(RTC);
    private readonly toast: ToastService = inject(ToastService);

    public constructor() {
        this.ws.onopen = (): void => {
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
                    this.rtc.clearConnection(data.peerId);
                    break;
                case ResponseType.PEER_OFFER:
                    console.log("[WebSocket] Received offer request from peer", data);
                    const offer: string = await this.rtc.createOffer(data.peerId, data.name, data.device);
                    this.sendMessage({
                        type: RequestType.PEER_OFFER,
                        data: {
                            offer: offer,
                            peerId: data.peerId,
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
            console.log("[WebSocket] Connection closed", e);
        };

        this.ws.onerror = (e): void => {
            console.log("[WebSocket] Connection error", e);
        };
    }

    public init(): void {
        console.log("[WebSocket] Initialize connection");
    }

    public sendMessage<T>(message: T): void {
        this.ws.send(JSON.stringify(message));
    }

    private connectWebSocket(): void {
        this.sendMessage<ConnectRequest>({
            type: RequestType.CONNECT,
            data: {
                name: "John",
                discoverability: Discoverability.NETWORK,
            },
        });
    }
}
