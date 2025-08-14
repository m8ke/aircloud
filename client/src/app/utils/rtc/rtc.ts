import { inject, Injectable } from "@angular/core";
import { Compression } from "@/utils/compression/compression";

@Injectable({
    providedIn: "root",
})
export class RTC {
    private readonly compression: Compression = inject(Compression);

    private readonly dcs: Map<string, RTCDataChannel> = new Map<string, RTCDataChannel>();
    private readonly pcs: Map<string, RTCPeerConnection> = new Map<string, RTCPeerConnection>();
    private readonly iceCandidates: Map<string, RTCIceCandidateInit[]> = new Map<string, RTCIceCandidateInit[]>();

    private receiveBuffer: Uint8Array[] = [];
    private receivedSize: number = 0;
    private fileMetadata: { name: string; size: number } | null = null;
    private static readonly CHUNK_SIZE: number = 16 * 1024;

    /**
     * Establish a peer connection.
     *
     * @param connectionId
     * @private
     */
    private establishPeerConnection(connectionId: string): RTCPeerConnection {
        if (this.pcs.has(connectionId)) {
            return this.pcs.get(connectionId)!;
        }

        const pc: RTCPeerConnection = new RTCPeerConnection({
            iceServers: [{
                urls: [
                    "stun:stun.l.google.com:19302",
                    "stun:stun1.l.google.com:19302",
                    "stun:stun2.l.google.com:19302",
                    "stun:stun3.l.google.com:19302",
                    "stun:stun4.l.google.com:19302",
                ],
            }],
        });

        // Store ICE candidates for later
        pc.onicecandidate = (event): void => {
            if (event.candidate) {
                if (!this.iceCandidates.has(connectionId)) {
                    this.iceCandidates.set(connectionId, []);
                }
                this.iceCandidates.get(connectionId)!.push(event.candidate.toJSON());
            }
        };

        // Clear memory
        pc.onconnectionstatechange = (): void => {
            const cs = pc.connectionState;
            if (cs === "failed" || cs === "closed" || cs === "disconnected") {
                this.clearConnection(connectionId);
            }
        };

        this.pcs.set(connectionId, pc);
        return pc;
    }

    /**
     * Create an offer and compress it.
     *
     * @param connectionId connection ID to establish a peer-to-peer connection
     */
    public async createOffer(connectionId: string): Promise<string> {
        const pc: RTCPeerConnection = this.establishPeerConnection(connectionId);

        const dc: RTCDataChannel = pc.createDataChannel(`dc-${connectionId}`);
        this.setupDataChannel(connectionId, dc);

        const offer: RTCSessionDescriptionInit = await pc.createOffer();
        await pc.setLocalDescription(offer);

        await this.waitForICEGathering(connectionId);
        return this.compression.compress(JSON.stringify(pc.localDescription));
    }

    /**
     * Create an answer according to the offer.
     *
     * @param connectionId connection ID to establish a peer-to-peer connection
     * @param offer compressed offer from another peer
     */
    public async createAnswer(connectionId: string, offer: string) {
        const pc: RTCPeerConnection = this.establishPeerConnection(connectionId);

        pc.ondatachannel = (event): void => {
            this.setupDataChannel(connectionId, event.channel);
        };

        await pc.setRemoteDescription(
            new RTCSessionDescription(JSON.parse(this.compression.decompress(offer))),
        );

        const answer: RTCSessionDescriptionInit = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        await this.waitForICEGathering(connectionId);
        console.log("[WebRTC] Created an answer");
        return this.compression.compress(JSON.stringify(pc.localDescription));
    }

    /**
     * Approve the answer that was received from the other peer.
     *
     * @param connectionId peer who received an offer and answered
     * @param answer compressed answer from another peer
     */
    public async approveAnswer(connectionId: string, answer: string): Promise<void> {
        const pc: RTCPeerConnection | undefined = this.pcs.get(connectionId);

        if (!pc) {
            throw new Error(`No RTCPeerConnection for connection ID ${connectionId}`);
        }

        await pc.setRemoteDescription(
            new RTCSessionDescription(JSON.parse(this.compression.decompress(answer))),
        );

        console.log("[WebRTC] Accepted answer");
    }

    /**
     * Setup data channels to listen to events (open, close, message).
     *
     * @param connectionId connection ID to establish a peer-to-peer connection
     * @param dc data channel
     * @private
     */
    private setupDataChannel(connectionId: string, dc: RTCDataChannel) {
        dc.onopen = (e) => console.log(`[WebRTC] DC open on connection ID ${connectionId}`);
        dc.onclose = (e) => console.log(`[WebRTC] DC closed on connection ID ${connectionId}`);
        dc.onmessage = async (e: MessageEvent<any>) => await this.handleDataChannelMessage(e);
        this.dcs.set(connectionId, dc);
    }

    /**
     * Wait for ICE gathering.
     *
     * @param connectionId connection ID to establish a peer-to-peer connection
     * @private
     */
    private async waitForICEGathering(connectionId: string): Promise<void> {
        const pc: RTCPeerConnection | undefined = this.pcs.get(connectionId);

        if (!pc) {
            return;
        }

        if (pc.iceGatheringState === "complete") {
            return;
        }

        await new Promise<void>((resolve) => {
            const check = () => {
                if (pc.iceGatheringState === "complete") {
                    pc.removeEventListener("icegatheringstatechange", check);
                    resolve();
                }
            };
            pc.addEventListener("icegatheringstatechange", check);
        });
    }

    /**
     * Handle data channel message.
     *
     * @param event message event
     * @private
     */
    private async handleDataChannelMessage(event: MessageEvent<any>): Promise<void> {
        console.log("[WebRTC] Received message", JSON.stringify(event.data));

        // Check if message is metadata or chunk
        if (typeof event.data === "string" && event.data.startsWith("meta:")) {
            this.fileMetadata = JSON.parse(event.data.slice(5));
            this.receiveBuffer = [];
            this.receivedSize = 0;
            console.log("[WebRTC] Receiving file", this.fileMetadata);
        } else if (event.data instanceof ArrayBuffer || event.data instanceof Blob) {
            // Receive chunk
            const chunk = event.data instanceof ArrayBuffer ? new Uint8Array(event.data) :
                event.data instanceof Blob
                    ? await event.data.arrayBuffer().then(buf => new Uint8Array(buf))
                    : new Uint8Array();

            this.receiveBuffer.push(chunk);
            this.receivedSize += chunk.length;

            if (this.fileMetadata && this.receivedSize === this.fileMetadata.size) {
                // Reconstruct file
                const received: Blob = new Blob(this.receiveBuffer);
                this.saveReceivedFile(received, this.fileMetadata.name);
                this.fileMetadata = null;
                this.receiveBuffer = [];
                this.receivedSize = 0;
                console.log("[WebRTC] File received successfully");
            }
        } else {
            console.log("[WebRTC] Received non-file message", event.data);
        }
    }

    /**
     * Clear connection to optimize the memory.
     *
     * @param connectionId connection ID to establish a peer-to-peer connection
     */
    public clearConnection(connectionId: string): void {
        this.dcs.get(connectionId)?.close();
        this.dcs.delete(connectionId);

        const pc = this.pcs.get(connectionId);

        if (pc) {
            pc.onicecandidate = null;
            pc.onconnectionstatechange = null;
            pc.close();
        }

        this.pcs.delete(connectionId);
    }

    /**
     * Send file to the peer through unique data channel.
     *
     * @param connectionId connection ID to establish a peer-to-peer connection
     * @param file file blob
     */
    public async sendFile(connectionId: string, file: File): Promise<void> {
        const dc: RTCDataChannel | undefined = this.dcs.get(connectionId);

        if (!dc || dc.readyState !== "open") {
            throw new Error(`[WebRTC] DataChannel to ${connectionId} is not open`);
        }

        const metadata = JSON.stringify({name: file.name, size: file.size});
        dc.send(`meta:${metadata}`);

        let offset: number = 0;

        const sendChunk = async (chunk: Uint8Array) => {
            // Avoid overflowing the buffer
            while (dc.bufferedAmount > RTC.CHUNK_SIZE * 2) {
                await new Promise((r) => setTimeout(r, 100));
            }
            dc.send(chunk);
        };

        while (offset < file.size) {
            const slice: Blob = file.slice(offset, offset + RTC.CHUNK_SIZE);
            const arrayBuffer: ArrayBuffer = await slice.arrayBuffer();
            await sendChunk(new Uint8Array(arrayBuffer));
            offset += RTC.CHUNK_SIZE;
        }

        dc.send("EOF");
        console.log(`[WebRTC] File sent to ${connectionId} successfully`);
    }

    /**
     * Save received files automatically.
     * TODO: Use "Accept" or "Decline" instead of this.
     *
     * @param blob
     * @param filename
     * @private
     */
    private saveReceivedFile(blob: Blob, filename: string): void {
        const url: string = URL.createObjectURL(blob);
        const a: HTMLAnchorElement = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Send text message to the peer.
     * TODO: Implement this.
     *
     * @param peerId
     * @param message
     */
    public sendMessage(peerId: string, message: string): void {
        throw new Error("Not implemented");
    }

}
