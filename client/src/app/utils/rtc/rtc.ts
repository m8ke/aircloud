import { inject, Injectable, signal } from "@angular/core";
import { Compression } from "@/utils/compression/compression";
import { PeerFile, PeerFileMetadata } from "@/utils/rtc/peer-file";
import { Peer } from "@/utils/rtc/peer";

enum RTCType {
    EOF = "EOF",
    REQUESTED_FILE_SHARE = "REQUESTED_FILE_SHARE",
    ACCEPTED_FILE_SHARE = "ACCEPTED_FILE_SHARE",
    DENIED_FILE_SHARE = "DENIED_FILE_SHARE",
    SEND_FILE_METADATA = "SEND_FILE_METADATA",
}

@Injectable({
    providedIn: "root",
})
export class RTC {
    public myPeerId!: string;
    private readonly compression: Compression = inject(Compression);

    private readonly pendingFiles: Map<string, File[]> = new Map<string, File[]>();
    private readonly receivingFiles: Map<string, PeerFile[]> = new Map<string, PeerFile[]>();

    public readonly pcs = signal<Map<string, Peer>>(new Map<string, Peer>());
    private readonly dcs: Map<string, RTCDataChannel> = new Map<string, RTCDataChannel>();
    private readonly iceCandidates: Map<string, RTCIceCandidateInit[]> = new Map<string, RTCIceCandidateInit[]>();

    private static readonly CHUNK_SIZE: number = 64 * 1024;

    /**
     * Establish a peer connection.
     *
     * @param peerId
     * @param name
     * @param device
     * @private
     */
    private establishPeerConnection(peerId: string, name: string, device: string): RTCPeerConnection {
        if (this.pcs().has(peerId)) {
            return this.pcs().get(peerId)?.pc!;
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
                if (!this.iceCandidates.has(peerId)) {
                    this.iceCandidates.set(peerId, []);
                }
                this.iceCandidates.get(peerId)!.push(event.candidate.toJSON());
            }
        };

        // Clear memory
        pc.onconnectionstatechange = (): void => {
            const cs = pc.connectionState;
            if (cs === "failed" || cs === "closed" || cs === "disconnected") {
                this.clearConnection(peerId);
            }
        };

        this.pcs.update(pcs => {
            const newMap = new Map(pcs);
            newMap.set(peerId, new Peer(name, device, pc));
            return newMap;
        });

        return pc;
    }

    /**
     * Create an offer and compress it.
     *
     * @param peerId peer ID to establish a peer-to-peer connection
     * @param name
     * @param device
     */
    public async createOffer(peerId: string, name: string, device: string): Promise<string> {
        const pc: RTCPeerConnection = this.establishPeerConnection(peerId, name, device);

        const dc: RTCDataChannel = pc.createDataChannel(`dc-${peerId}`);
        this.setupDataChannel(peerId, dc);

        const offer: RTCSessionDescriptionInit = await pc.createOffer();
        await pc.setLocalDescription(offer);

        await this.waitForICEGathering(peerId);
        return this.compression.compress(JSON.stringify(pc.localDescription));
    }

    /**
     * Create an answer according to the offer.
     *
     * @param peerId peer ID to establish a peer-to-peer connection
     * @param offer compressed offer from another peer
     * @param name
     * @param device
     */
    public async createAnswer(peerId: string, offer: string, name: string, device: string) {
        const pc: RTCPeerConnection = this.establishPeerConnection(peerId, name, device);

        pc.ondatachannel = (event): void => {
            this.setupDataChannel(peerId, event.channel);
        };

        await pc.setRemoteDescription(
            new RTCSessionDescription(JSON.parse(this.compression.decompress(offer))),
        );

        const answer: RTCSessionDescriptionInit = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        await this.waitForICEGathering(peerId);
        console.log("[WebRTC] Created an answer");
        return this.compression.compress(JSON.stringify(pc.localDescription));
    }

    /**
     * Approve the answer that was received from the other peer.
     *
     * @param peerId peer ID who received an offer and answered
     * @param answer compressed answer from another peer
     */
    public async approveAnswer(peerId: string, answer: string): Promise<void> {
        const pc: RTCPeerConnection | undefined = this.pcs().get(peerId)?.pc;

        if (!pc) {
            throw new Error(`No RTCPeerConnection for connection ID ${peerId}`);
        }

        await pc.setRemoteDescription(
            new RTCSessionDescription(JSON.parse(this.compression.decompress(answer))),
        );

        console.log("[WebRTC] Accepted answer");
    }

    /**
     * Setup data channels to listen to events (open, close, message).
     *
     * @param peerId connection ID to establish a peer-to-peer connection
     * @param dc data channel
     * @private
     */
    private setupDataChannel(peerId: string, dc: RTCDataChannel): void {
        dc.onopen = (event) => this.handleDataChannelOpen(peerId);
        dc.onclose = (event) => this.handleDataChannelClose(peerId);
        dc.onmessage = async (event: MessageEvent<any>): Promise<void> => await this.handleDataChannelMessage(event, dc);
        this.dcs.set(peerId, dc);
    }

    /**
     * Wait for ICE gathering.
     *
     * @param peerId connection ID to establish a peer-to-peer connection
     * @private
     */
    private async waitForICEGathering(peerId: string): Promise<void> {
        const pc: RTCPeerConnection | undefined = this.pcs().get(peerId)?.pc;

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
     * @param dc
     * @private
     */
    private async handleDataChannelMessage(event: MessageEvent<any>, dc: RTCDataChannel): Promise<void> {
        if (event.data instanceof ArrayBuffer || event.data instanceof Blob) {
            await this.receiveFiles(dc.label, event.data);
            return;
        }

        const data = JSON.parse(event.data);
        const type = data.type;

        console.log(`[WebRTC] Received message type ${type}`);

        if (!(type in RTCType)) {
            throw Error(`[WebRTC] Received type ${type} is not supported`);
        }

        switch (type) {
            case RTCType.REQUESTED_FILE_SHARE:
                // TODO: Show modal/toast to accept or deny the request
                const metadata: PeerFileMetadata[] = data.metadata;

                // Save metadata so we know what to expect if user accepts
                const peerFiles = metadata.map(meta => new PeerFile(meta));
                this.receivingFiles.set(dc.label, peerFiles);

                console.log(`[WebRTC] ${dc.label} wants to send files:`, metadata);

                // Ask user for confirmation
                if (confirm(`Accept ${metadata.length} file(s)?`)) {
                    this.acceptedFileSharing(dc, peerFiles);
                } else {
                    dc.send(JSON.stringify({type: RTCType.DENIED_FILE_SHARE}));
                }
                break;
            case RTCType.ACCEPTED_FILE_SHARE:
                const files: File[] | undefined = this.pendingFiles.get(dc.label);

                if (files && files.length > 0) {
                    await this.sendFiles(dc, files);
                }
                break;
            case RTCType.DENIED_FILE_SHARE:
                // TODO: Show notification about denied request
                //       Remove pending files
                //       Remove pending files when peerId is disconnected as well
                console.log("DENIED FILE SHARE");
                break;
            case RTCType.EOF: {
                const files = this.receivingFiles.get(dc.label) ?? [];
                const current = files.find(f => !f.complete && f.receivedSize === f.metadata.size);

                if (current) {
                    current.complete = true;
                    const blob = new Blob(current.buffer);
                    this.saveReceivedFile(blob, current.metadata.name);
                    console.log(`[WebRTC] File complete: ${current.metadata.name}`);
                }

                break;
            }
        }
    }

    /**
     * Clear connection to optimize the memory.
     *
     * @param peerId connection ID to establish a peer-to-peer connection
     */
    public clearConnection(peerId: string): void {
        this.dcs.get(peerId)?.close();
        this.dcs.delete(peerId);

        const pc = this.pcs().get(peerId)?.pc;

        if (pc) {
            pc.onicecandidate = null;
            pc.onconnectionstatechange = null;
            pc.close();
        }

        this.pcs.update(pcs => {
            const newMap = new Map(pcs);
            newMap.delete(peerId);
            return newMap;
        });
    }

    public requestFileSending(peerId: string, files: File[]): void {
        const dc: RTCDataChannel | undefined = this.dcs.get(peerId);

        if (!dc || dc.readyState !== "open") {
            throw new Error(`[WebRTC] DataChannel to ${peerId} is not open`);
        }

        const metadata: PeerFileMetadata[] = files.map((file: File) => {
            return {name: file.name, size: file.size, type: file.type};
        });

        this.pendingFiles.set(dc.label, files);

        // TODO: Add interface
        dc.send(JSON.stringify({
            type: RTCType.REQUESTED_FILE_SHARE,
            metadata: metadata,
        }));
    }

    public acceptedFileSharing(dc: RTCDataChannel, files: PeerFile[]): void {
        if (!dc || dc.readyState !== "open") {
            throw new Error(`[WebRTC] DataChannel ID ${dc.label} is not open`);
        }

        this.receivingFiles.set(dc.label, files);

        // TODO: Add interface
        dc.send(JSON.stringify({
            type: RTCType.ACCEPTED_FILE_SHARE,
        }));
    }

    /**
     * Send file to the peer through unique data channel.
     *
     * @param dc RTC data channel
     * @param files file blobs
     */
    public async sendFiles(dc: RTCDataChannel, files: File[]): Promise<void> {
        if (!dc || dc.readyState !== "open") {
            throw new Error(`[WebRTC] DataChannel ${dc?.label ?? "unknown"} is not open`);
        }

        const waitForBuffer = async () => {
            while (dc.bufferedAmount > RTC.CHUNK_SIZE) {
                await new Promise(r => setTimeout(r, 1));
            }
        };

        for (const file of files) {
            // Send metadata once
            dc.send(JSON.stringify({
                type: RTCType.SEND_FILE_METADATA,
                metadata: { name: file.name, size: file.size, type: file.type }
            }));

            let offset: number = 0;

            while (offset < file.size) {
                const slice = file.slice(offset, offset + RTC.CHUNK_SIZE);
                const chunk = new Uint8Array(await slice.arrayBuffer());

                dc.send(chunk);
                await waitForBuffer();

                offset += RTC.CHUNK_SIZE;
            }

            dc.send(JSON.stringify({ type: RTCType.EOF, name: file.name }));
            console.log(`[WebRTC] File "${file.name}" sent on DC ${dc.label}`);
        }

        console.log(`[WebRTC] Finished sending ${files.length} file(s) on DC ${dc.label}`);
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

    private handleDataChannelOpen(peerId: string): void {
        console.log(`[WebRTC] DC open on connection ID ${peerId}`);
    }

    private handleDataChannelClose(peerId: string): void {
        console.log(`[WebRTC] DC closed on connection ID ${peerId}`);
    }

    /**
     * Receive files from the peer.
     *
     * @param dcLabel
     * @param data array buffer or blob
     * @private
     */
    private async receiveFiles(dcLabel: string, data: any): Promise<void> {
        const files = this.receivingFiles.get(dcLabel) ?? [];
        const current = files.find(f => !f.complete);

        if (!current) return;

        const chunk = data instanceof ArrayBuffer
            ? new Uint8Array(data)
            : new Uint8Array(await data.arrayBuffer());

        current.buffer.push(chunk);
        current.receivedSize += chunk.length;

        console.log(`[WebRTC] Chunk received (${current.receivedSize}/${current.metadata.size})`);
    }
}
