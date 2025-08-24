import { UUID } from "node:crypto";
import { inject, Injectable, signal } from "@angular/core";
import { Peer } from "@/utils/rtc/peer";
import { Compression } from "@/utils/compression/compression";
import { ReceivingFile, PeerFileMetadata } from "@/utils/rtc/receiving-file";
import { NotificationService, NotificationType } from "@/ui/notification/notification.service";
import { SessionStorage } from "@/utils/storage/session-storage";
import { PendingFile } from "@/utils/rtc/pending-file";
import { Session } from "@/utils/session/session";

enum RTCType {
    EOF = "EOF",
    REQUESTED_FILE_SHARE = "REQUESTED_FILE_SHARE",
    ACCEPTED_FILE_SHARE = "ACCEPTED_FILE_SHARE",
    DENIED_FILE_SHARE = "DENIED_FILE_SHARE",
}

@Injectable({
    providedIn: "root",
})
export class RTC {
    private readonly session: Session = inject(Session);
    private readonly compression: Compression = inject(Compression);
    private readonly notification: NotificationService = inject(NotificationService);
    private readonly sessionStorage: SessionStorage = inject(SessionStorage);

    public readonly pcs = signal<Map<string, Peer>>(new Map<string, Peer>());
    public readonly pendingFiles = signal<Map<string, PendingFile[]>>(new Map<string, PendingFile[]>());
    public readonly receivingFiles = signal<Map<string, ReceivingFile[]>>(new Map<string, ReceivingFile[]>());

    private readonly dcs: Map<string, RTCDataChannel> = new Map<string, RTCDataChannel>();
    private readonly iceCandidates: Map<string, RTCIceCandidateInit[]> = new Map<string, RTCIceCandidateInit[]>();

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

        this.pcs.update(prev => {
            const next = new Map(prev);
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

        console.log("[WebRTC] Created an offer");

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

        pc.ondatachannel = (event: RTCDataChannelEvent): void => {
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

        if (!pc || pc.iceGatheringState === "complete") {
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
                return this.handleRequestedFileShare(dc, data);
            case RTCType.ACCEPTED_FILE_SHARE:
                return this.handleAcceptedFileShare(dc, data);
            case RTCType.DENIED_FILE_SHARE:
                return this.handleDeniedFileShare(dc, data);
            case RTCType.EOF:
                return this.handleEndOfFile(dc);
        }
    }

    // TODO: Add interface
    //       Add docs
    private handleRequestedFileShare(dc: RTCDataChannel, data: any): void {
        const name: string = data.name;
        const metadata: PeerFileMetadata[] = data.metadata;
        const files: ReceivingFile[] = metadata.map(meta => new ReceivingFile(meta));

        console.log(`[WebRTC] ${dc.label} requested to send files:`, metadata);

        this.notification.show({name, metadata}, NotificationType.FILE_REQUEST).subscribe({
            next: (result): void => {
                if (result == "accept") {
                    this.receivingFiles.update(prev => {
                        const next = new Map(prev);
                        next.set(dc.label, files);
                        return next;
                    });

                    this.acceptedFileSharing(dc, files);
                } else {
                    dc.send(JSON.stringify({
                        type: RTCType.DENIED_FILE_SHARE,
                        peerId: data.peerId,
                    }));
                }
            },
        });
    }

    // TODO: Add interface
    //       Add docs
    private async handleAcceptedFileShare(dc: RTCDataChannel, data: any): Promise<void> {
        const files: PendingFile[] | undefined = this.pendingFiles().get(data.peerId);

        if (files && files.length > 0) {
            await this.sendFiles(data.peerId, dc, files);
        }
    }

    // TODO: Add interface
    //       Add docs
    private handleDeniedFileShare(dc: RTCDataChannel, data: any): void {
        // TODO: Show notification about denied request (maybe not)
        //       Remove pending files when peerId is disconnected as well (in another method)
        console.log("[WebRTC] Denied file share");
        this.removePendingFilesByPeerId(data.peerId);
    }

    // TODO: Add docs
    private handleEndOfFile(dc: RTCDataChannel): void {
        const files: ReceivingFile[] | undefined = this.receivingFiles().get(dc.label);

        if (files) {
            // TODO: Add unique ID for file and replace this condition
            const current: ReceivingFile | undefined = files.find(f => f.receivedSize === f.metadata.size);

            if (current) {
                const blob: Blob = new Blob(current.buffer);
                this.downloadReceivedFile(blob, current.metadata.name);

                console.log(`[WebRTC] File complete: ${current.metadata.name}`);

                // TODO: Refactor needed. It's a workaround for now. Should use unique ID.
                this.receivingFiles.update(prev => {
                    const next = new Map(prev);
                    const channelFiles = next.get(dc.label) ?? [];
                    const remainingFiles = channelFiles.filter(f => f !== current);

                    if (remainingFiles.length > 0) {
                        next.set(dc.label, remainingFiles);
                    } else {
                        next.delete(dc.label);
                    }

                    return next;
                });
            }
        }
    }

    /**
     * Clear connection.
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

        const metadata: PeerFileMetadata[] = files.map(file => ({
            name: file.name,
            size: file.size,
            type: file.type,
        }));

        const pendingFileList: PendingFile[] = files.map(file => new PendingFile(file));

        this.pendingFiles.update(prev => {
            const next = new Map(prev);
            next.set(peerId, pendingFileList);
            return next;
        });

        // TODO: Add interface
        dc.send(JSON.stringify({
            type: RTCType.REQUESTED_FILE_SHARE,
            name: this.session.name,
            peerId: peerId,
            metadata: metadata,
        }));
    }

    private acceptedFileSharing(dc: RTCDataChannel, files: ReceivingFile[]): void {
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
            peerId: this.session.peerId,
        }));
    }

    /**
     * Send file to the peer through unique data channel.
     *
     * @param peerId peer ID with which the connection has been established
     * @param dc RTC data channel used for P2P connection
     * @param files file blobs that will be sent
     */
    private async sendFiles(peerId: string, dc: RTCDataChannel, files: PendingFile[]): Promise<void> {
        if (!dc || dc.readyState !== "open") {
            throw new Error(`[WebRTC] DataChannel ${dc?.label ?? "unknown"} is not open`);
        }

        let totalSent: number = 0;

        this.pendingFiles.update(prev => {
            const next = new Map(prev);
            next.set(peerId, files);
            return next;
        });

        for (const pending of files) {
            const file: File = pending.file;
            let offset: number = 0;

            while (offset < file.size) {
                const slice: Blob = file.slice(offset, offset + RTC.CHUNK_SIZE);
                const chunk: Uint8Array<ArrayBuffer> = new Uint8Array(await slice.arrayBuffer());

                totalSent += chunk.byteLength;
                pending.receivedSize += chunk.byteLength;

                this.pendingFiles.update(prev => {
                    const next = new Map(prev);
                    next.set(peerId, [...files]);
                    return next;
                });

                dc.send(chunk);
                await this.waitForBuffer(dc);

                offset += RTC.CHUNK_SIZE;
            }

            pending.complete = true;

            // TODO: Add an interface
            dc.send(JSON.stringify({
                type: RTCType.EOF,
            }));

            console.log(`[WebRTC] File "${file.name}" sent on DC ${dc.label}`);
        }

        this.removePendingFilesByPeerId(peerId);
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
            const handler = (): void => {
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
        const files: ReceivingFile[] | undefined = this.receivingFiles().get(dcLabel);

        if (files) {
            const current: ReceivingFile | undefined = files.find(f => !f.complete);

            if (current) {
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
    }

    public removePendingFilesByPeerId(peerId: string): void {
        this.pendingFiles.update(prev => {
            const next = new Map(prev);
            next.delete(peerId);
            return next;
        });
    }
}
