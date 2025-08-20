import { UUID } from "node:crypto";
import { inject, Injectable, signal } from "@angular/core";
import { Peer } from "@/utils/rtc/peer";
import { ToastService } from "@/ui/toast/toast.service";
import { Compression } from "@/utils/compression/compression";
import { PeerFile, PeerFileMetadata } from "@/utils/rtc/peer-file";
import { PeerProgress } from "@/utils/rtc/peer-progress";

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
    private readonly toast: ToastService = inject(ToastService);
    private readonly compression: Compression = inject(Compression);

    public readonly pcs = signal<Map<string, Peer>>(new Map<string, Peer>());
    public readonly sendingProgress = signal<Map<string, PeerProgress>>(new Map<string, PeerProgress>);

    private readonly dcs: Map<string, RTCDataChannel> = new Map<string, RTCDataChannel>();
    private readonly iceCandidates: Map<string, RTCIceCandidateInit[]> = new Map<string, RTCIceCandidateInit[]>();
    private readonly pendingFiles: Map<string, File[]> = new Map<string, File[]>();
    public readonly receivingFiles = signal<Map<string, PeerFile[]>>(new Map<string, PeerFile[]>());

    private static readonly CHUNK_SIZE: number = 64 * 1024;

    /**
     * Establish a peer connection.
     *
     * @param peerId peer ID with which the connection will be established
     * @param name peer's name
     * @param device peer's device OS family
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
                this.closeConnection(peerId);
            }
        };

        this.pcs.update(prevp => {
            const next = new Map(prevp);
            next.set(peerId, new Peer(name, device, pc));
            return next;
        });

        return pc;
    }

    /**
     * Create an offer and compress it.
     *
     * @param peerId peer ID with which the connection will be established
     * @param name peer's name
     * @param device peer's device OS family
     */
    public async createOffer(peerId: string, name: string, device: string): Promise<string> {
        const dataChannelId: UUID = crypto.randomUUID();
        const pc: RTCPeerConnection = this.establishPeerConnection(peerId, name, device);
        const dc: RTCDataChannel = pc.createDataChannel(dataChannelId);

        dc.bufferedAmountLowThreshold = RTC.CHUNK_SIZE;
        this.setupDataChannel(peerId, dc);

        const offer: RTCSessionDescriptionInit = await pc.createOffer();
        await pc.setLocalDescription(offer);

        await this.waitForICEGathering(peerId);

        return this.compression.compress(JSON.stringify(pc.localDescription));
    }

    /**
     * Create an answer according to the offer.
     *
     * @param peerId peer ID with which the connection will be established
     * @param offer compressed offer from another peer
     * @param name peer's name
     * @param device peer's device OS family
     */
    public async createAnswer(peerId: string, offer: string, name: string, device: string): Promise<string> {
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
     * @param peerId peer ID with which the connection will be established
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
     * @param peerId peer ID with which the connection has been established
     * @param dc data channel
     * @private
     */
    private setupDataChannel(peerId: string, dc: RTCDataChannel): void {
        this.dcs.set(peerId, dc);
        dc.onopen = (event) => this.handleDataChannelOpen(dc.label);
        dc.onclose = (event) => this.handleDataChannelClose(peerId);
        dc.onmessage = async (event: MessageEvent<any>): Promise<void> => await this.handleDataChannelMessage(event, dc);
    }

    /**
     * Wait for ICE gathering.
     *
     * @param peerId peer ID with which the connection will be established
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
     * @param dc data channel
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
            throw new Error(`[WebRTC] Received type ${type} is not supported`);
        }

        switch (type) {
            case RTCType.REQUESTED_FILE_SHARE:
                // TODO: Show modal/toast to accept or deny the request
                const metadata: PeerFileMetadata[] = data.metadata;

                const peerFiles: PeerFile[] = metadata.map(meta => new PeerFile(meta));

                this.receivingFiles.update(prev => {
                    const next = new Map(prev);
                    next.set(dc.label, peerFiles);
                    return next;
                });

                console.log(`[WebRTC] ${dc.label} wants to send files:`, metadata);

                this.acceptedFileSharing(dc, peerFiles);
                // dc.send(JSON.stringify({type: RTCType.DENIED_FILE_SHARE}));
                break;
            case RTCType.ACCEPTED_FILE_SHARE:
                const files: File[] | undefined = this.pendingFiles.get(data.peerId);

                if (files && files.length > 0) {
                    await this.sendFiles(data.peerId, dc, files);
                }
                break;
            case RTCType.DENIED_FILE_SHARE:
                // TODO: Show notification about denied request
                //       Remove pending files
                //       Remove pending files when peerId is disconnected as well
                console.log("DENIED FILE SHARE");
                break;
            case RTCType.EOF: {
                const files: PeerFile[] = this.receivingFiles().get(dc.label) ?? [];

                // TODO: Add unique ID for file and replace this condition
                const current: PeerFile | undefined = files.find(f => f.receivedSize === f.metadata.size);

                if (current) {
                    const blob: Blob = new Blob(current.buffer);
                    this.downloadReceivedFile(blob, current.metadata.name);

                    console.log(`[WebRTC] File complete: ${current.metadata.name}`);

                    this.receivingFiles.update(prev => {
                        const next = new Map(prev);
                        next.delete(dc.label);
                        return next;
                    });
                }
                break;
            }
        }
    }

    /**
     * Clear connection to optimize the memory.
     *
     * @param peerId peer ID with which the connection has been established
     */
    public closeConnection(peerId: string): void {
        const dc: RTCDataChannel | undefined = this.dcs.get(peerId);

        if (dc) {
            dc.close();
            this.dcs.delete(peerId);
        }

        const pc: RTCPeerConnection | undefined = this.pcs().get(peerId)?.pc;

        if (pc) {
            pc.onicecandidate = null;
            pc.onconnectionstatechange = null;
            pc.close();

            this.pcs.update(prev => {
                const next = new Map(prev);
                next.delete(peerId);
                return next;
            });

            if (dc) {
                this.receivingFiles.update(prev => {
                    const next = new Map(prev);
                    next.delete(dc.label);
                    return next;
                });
            }
        }
    }

    /**
     * Request approval or rejection from the other peer to send files.
     *
     * @param peerId peer ID with which the connection has been established
     * @param files files that will be sent
     */
    public requestFileSending(peerId: string, files: File[]): void {
        const dc: RTCDataChannel | undefined = this.dcs.get(peerId);

        if (!dc || dc.readyState !== "open") {
            this.closeConnection(peerId);
            throw new Error(`[WebRTC] DataChannel to ${peerId} is not open`);
        }

        const metadata: PeerFileMetadata[] = files.map((file: File) => {
            return {name: file.name, size: file.size, type: file.type};
        });

        this.pendingFiles.set(peerId, files);

        // TODO: Add interface
        dc.send(JSON.stringify({
            type: RTCType.REQUESTED_FILE_SHARE,
            metadata: metadata,
        }));
    }

    private acceptedFileSharing(dc: RTCDataChannel, files: PeerFile[]): void {
        if (!dc || dc.readyState !== "open") {
            throw new Error(`[WebRTC] DataChannel ID ${dc.label} is not open`);
        }

        this.receivingFiles.update(prev => {
            const next = new Map(prev);
            next.set(dc.label, files);
            return next;
        });

        // TODO: Add interface
        dc.send(JSON.stringify({
            type: RTCType.ACCEPTED_FILE_SHARE,
            peerId: this.myPeerId,
        }));
    }

    /**
     * Send file to the peer through unique data channel.
     *
     * @param peerId peer ID with which the connection has been established
     * @param dc RTC data channel used for P2P connection
     * @param files file blobs that will be sent
     */
    private async sendFiles(peerId: string, dc: RTCDataChannel, files: File[]): Promise<void> {
        if (!dc || dc.readyState !== "open") {
            throw new Error(`[WebRTC] DataChannel ${dc?.label ?? "unknown"} is not open`);
        }

        const totalSize: number = files.reduce((sum, file) => sum + file.size, 0);

        this.sendingProgress().set(peerId, new PeerProgress(totalSize, 0));
        const peerProgress: PeerProgress = this.sendingProgress().get(peerId)!;

        for (const file of files) {
            dc.send(JSON.stringify({
                type: RTCType.SEND_FILE_METADATA,
                metadata: {name: file.name, size: file.size, type: file.type},
            }));

            let offset: number = 0;

            while (offset < file.size) {
                const slice: Blob = file.slice(offset, offset + RTC.CHUNK_SIZE);
                const chunk: Uint8Array = new Uint8Array(await slice.arrayBuffer());

                peerProgress.sentSize = peerProgress.sentSize + chunk.byteLength;

                this.sendingProgress.update(prev => {
                    const next = new Map(prev);
                    const curr = next.get(peerId) ?? {totalSize: totalSize, sentSize: 0};
                    next.set(peerId, {...curr, sentSize: curr.sentSize + chunk.byteLength});
                    return next;
                });

                dc.send(chunk);
                await this.waitForBuffer(dc);

                offset += RTC.CHUNK_SIZE;
            }

            // TODO: Add an interface
            dc.send(JSON.stringify({
                type: RTCType.EOF,
                name: file.name,
            }));

            console.log(`[WebRTC] File "${file.name}" sent on DC ${dc.label}`);
        }

        console.log(`[WebRTC] Finished sending ${files.length} file(s) on DC ${dc.label}`);
    }

    /**
     * Wait for buffer.
     *
     * @param dc data channel
     * @private
     */
    private async waitForBuffer(dc: RTCDataChannel): Promise<void> {
        if (dc.bufferedAmount <= RTC.CHUNK_SIZE) {
            return Promise.resolve();
        }

        return new Promise(resolve => {
            const handler = () => {
                dc.removeEventListener("bufferedamountlow", handler);
                resolve();
            };

            dc.addEventListener("bufferedamountlow", handler, {once: true});
        });
    }

    /**
     * Download received files.
     *
     * @param blob file blob
     * @param filename file name
     * @private
     */
    private downloadReceivedFile(blob: Blob, filename: string): void {
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
     * @param peerId peer ID with which the connection has been established
     * @param message text message that will be sent
     */
    public sendMessage(peerId: string, message: string): void {
        throw new Error("Not implemented");
    }

    private handleDataChannelOpen(peerId: string): void {
        console.log(`[WebRTC] DC open on connection ID ${peerId}`);
    }

    private handleDataChannelClose(peerId: string): void {
        console.log(`[WebRTC] DC closed on connection ID ${peerId}`);
        this.closeConnection(peerId);
    }

    /**
     * Receive files from the peer.
     *
     * @param dcLabel data channel name
     * @param data array buffer or blob
     * @private
     */
    private async receiveFiles(dcLabel: string, data: any): Promise<void> {
        const files: PeerFile[] = this.receivingFiles().get(dcLabel) ?? [];
        const current: PeerFile | undefined = files.find(f => !f.complete);

        if (!current) return;

        const chunk: Uint8Array = data instanceof ArrayBuffer
            ? new Uint8Array(data)
            : new Uint8Array(await data.arrayBuffer());

        current.buffer.push(chunk);
        current.receivedSize += chunk.length;

        this.receivingFiles.update((prev) => {
            const next = new Map(prev);
            next.set(dcLabel, [...files]);
            return next;
        });
    }
}
