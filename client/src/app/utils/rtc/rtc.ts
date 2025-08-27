import { v4 as uuidv4 } from "uuid";
import { computed, inject, Injectable, signal } from "@angular/core";

import { Peer } from "@/utils/rtc/peer";
import { Session } from "@/utils/session/session";
import { SendingFile } from "@/utils/file-manager/sending-file";
import { Compression } from "@/utils/compression/compression";
import { ConnectionType } from "@/utils/rtc/connection-type";
import { PeerFileMetadata, ReceivingFile } from "@/utils/file-manager/receiving-file";
import { NotificationService, NotificationType } from "@/ui/notification/notification.service";

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
    private readonly session: Session = inject<Session>(Session);
    private readonly compression: Compression = inject<Compression>(Compression);
    private readonly notification: NotificationService = inject<NotificationService>(NotificationService);

    public readonly pcs = signal<Map<string, Peer>>(new Map<string, Peer>());
    public readonly sendingFiles = signal<Map<string, SendingFile>>(new Map<string, SendingFile>());
    public readonly receivingFiles = signal<Map<string, ReceivingFile>>(new Map<string, ReceivingFile>());

    private readonly dcs: Map<string, RTCDataChannel> = new Map<string, RTCDataChannel>();
    private readonly iceCandidates: Map<string, RTCIceCandidateInit[]> = new Map<string, RTCIceCandidateInit[]>();

    private static readonly CHUNK_SIZE: number = 64 * 1024;

    /**
     * Establish a peer connection.
     *
     * @param peerId peer ID with which the connection will be established
     * @param name peer's name
     * @param device peer's device OS family
     * @param connectionType
     * @private
     */
    private establishPeerConnection(peerId: string, name: string, device: string, connectionType: ConnectionType): RTCPeerConnection {
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

        if (connectionType == ConnectionType.MANUAL) {
            this.session.addConnectedPeerId(peerId);
        }

        return pc;
    }

    /**
     * Create an offer and compress it.
     *
     * @param peerId peer ID with which the connection will be established
     * @param name peer's name
     * @param device peer's device OS family
     * @param connectionType
     */
    public async createOffer(peerId: string, name: string, device: string, connectionType: ConnectionType): Promise<string> {
        const pc: RTCPeerConnection = this.establishPeerConnection(peerId, name, device, connectionType);
        const dc: RTCDataChannel = pc.createDataChannel(uuidv4());

        dc.bufferedAmountLowThreshold = RTC.CHUNK_SIZE;
        this.setupDataChannel(peerId, dc);

        const offer: RTCSessionDescriptionInit = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await this.waitForICEGathering(peerId);

        console.log(`[WebRTC] Created an offer for peer ID ${peerId}`);

        return this.compression.compress(JSON.stringify(pc.localDescription));
    }

    /**
     * Create an answer according to the offer.
     *
     * @param peerId peer ID with which the connection will be established
     * @param offer compressed offer from another peer
     * @param name peer's name
     * @param device peer's device OS family
     * @param connectionType
     */
    public async createAnswer(peerId: string, offer: string, name: string, device: string, connectionType: ConnectionType): Promise<string> {
        const pc: RTCPeerConnection = this.establishPeerConnection(peerId, name, device, connectionType);

        pc.ondatachannel = (event: RTCDataChannelEvent): void => {
            this.setupDataChannel(peerId, event.channel);
        };

        await pc.setRemoteDescription(
            new RTCSessionDescription(JSON.parse(this.compression.decompress(offer))),
        );

        const answer: RTCSessionDescriptionInit = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await this.waitForICEGathering(peerId);

        console.log(`[WebRTC] Created an answer for peer ID ${peerId}`);

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

        console.log(`[WebRTC] Accepted an answer from peer ID ${peerId}`);
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
        dc.onopen = (event) => this.handleDataChannelOpen(peerId);
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

    // TODO: Add an interface
    //       Add docs
    private handleRequestedFileShare(dc: RTCDataChannel, data: any): void {
        const name: string = data.name;
        const metadata: PeerFileMetadata = data.metadata;

        console.log(`[WebRTC] Peer ID ${data.peerId} requested to send file ${metadata.name}`);

        this.notification.show({name, metadata}, NotificationType.FILE_REQUEST).subscribe({
            next: (result): void => {
                if (result == "accept") {
                    this.receivingFiles.update(prev => {
                        const next = new Map(prev);
                        next.set(dc.label, new ReceivingFile(metadata));
                        return next;
                    });

                    this.acceptedFileSharing(dc, new ReceivingFile(metadata));
                } else {
                    dc.send(JSON.stringify({
                        type: RTCType.DENIED_FILE_SHARE,
                        peerId: data.peerId,
                    }));
                }
            },
        });
    }

    // TODO: Add an interface
    //       Add docs
    private async handleAcceptedFileShare(dc: RTCDataChannel, data: any): Promise<void> {
        const file: SendingFile | undefined = this.sendingFiles().get(data.peerId);

        if (file) {
            await this.sendFile(data.peerId, dc, file);
        }
    }

    // TODO: Add an interface
    //       Add docs
    private handleDeniedFileShare(dc: RTCDataChannel, data: any): void {
        // TODO: Show notification about denied request (maybe not)
        //       Remove pending files when peerId is disconnected as well (in another method)
        console.log("[WebRTC] Denied file share");
        this.removePendingFilesByPeerId(data.peerId);
    }

    // TODO: Add docs
    private handleEndOfFile(dc: RTCDataChannel): void {
        const file: ReceivingFile | undefined = this.receivingFiles().get(dc.label);

        if (file) {
            const blob: Blob = new Blob(file.buffer);
            this.downloadReceivedFile(blob, file.metadata.name);

            console.log(`[WebRTC] File complete: ${file.metadata.name}`);

            this.receivingFiles.update(prev => {
                const next = new Map(prev);
                next.delete(dc.label);
                return next;
            });
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
                console.log(`[WebRTC] Connection with peer ID ${peerId} deleted`);
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
     * @param file file that will be sent
     */
    public requestFileSending(peerId: string, file: File): void {
        const dc: RTCDataChannel | undefined = this.dcs.get(peerId);

        if (!dc || dc.readyState !== "open") {
            this.closeConnection(peerId);
            throw new Error(`[WebRTC] DataChannel to ${peerId} is not open`);
        }

        this.sendingFiles.update(prev => {
            const next = new Map(prev);
            next.set(peerId, new SendingFile(file));
            return next;
        });

        // TODO: Add an interface
        dc.send(JSON.stringify({
            type: RTCType.REQUESTED_FILE_SHARE,
            name: this.session.name,
            peerId: peerId,
            metadata: {
                name: file.name,
                size: file.size,
                type: file.type,
            },
        }));
    }

    private acceptedFileSharing(dc: RTCDataChannel, file: ReceivingFile): void {
        if (!dc || dc.readyState !== "open") {
            throw new Error(`[WebRTC] DataChannel ID ${dc.label} is not open`);
        }

        this.receivingFiles.update(prev => {
            const next = new Map(prev);
            next.set(dc.label, file);
            return next;
        });

        // TODO: Add an interface
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
     * @param file file blobs that will be sent
     */
    private async sendFile(peerId: string, dc: RTCDataChannel, file: SendingFile): Promise<void> {
        if (!dc || dc.readyState !== "open") {
            throw new Error(`[WebRTC] DataChannel ${dc?.label ?? "unknown"} is not open`);
        }

        let totalSent: number = 0;

        this.sendingFiles.update(prev => {
            const next = new Map(prev);
            next.set(peerId, file);
            return next;
        });

        let offset: number = 0;

        while (offset < file.file.size) {
            const slice: Blob = file.file.slice(offset, offset + RTC.CHUNK_SIZE);
            const chunk: Uint8Array<ArrayBuffer> = new Uint8Array(await slice.arrayBuffer());

            totalSent += chunk.byteLength;
            file.receivedSize += chunk.byteLength;

            this.sendingFiles.update(prev => {
                const next = new Map(prev);
                next.set(peerId, file);
                return next;
            });

            dc.send(chunk);
            await this.waitForBuffer(dc);

            offset += RTC.CHUNK_SIZE;
        }

        file.complete = true;

        // TODO: Add an interface
        dc.send(JSON.stringify({
            type: RTCType.EOF,
        }));

        console.log(`[WebRTC] File "${file.file.name}" sent to peer ID ${peerId}`);
        this.removePendingFilesByPeerId(peerId);
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
        console.log(`[WebRTC] DC open on connection with peer ID ${peerId}`);
    }

    private handleDataChannelClose(peerId: string): void {
        console.log(`[WebRTC] DC closed on connection with peer ID ${peerId}`);
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
        const file: ReceivingFile | undefined = this.receivingFiles().get(dcLabel);

        if (file) {
            const chunk: ArrayBuffer = data instanceof ArrayBuffer
                ? data
                : new ArrayBuffer(await data.arrayBuffer());

            file.buffer.push(chunk);
            file.receivedSize += chunk.byteLength;

            this.receivingFiles.update((prev) => {
                const next = new Map(prev);
                next.set(dcLabel, file);
                return next;
            });
        }
    }

    public removePendingFilesByPeerId(peerId: string): void {
        this.sendingFiles.update(prev => {
            const next = new Map(prev);
            next.delete(peerId);
            return next;
        });
    }

    public readonly progress = computed(() => {
        let totalSize: number = 0;
        let receivedSize: number = 0;

        for (const file of this.receivingFiles().values()) {
            totalSize += file.metadata.size;
            receivedSize += file.receivedSize;
        }

        return totalSize > 0
            ? Math.round((receivedSize / totalSize) * 100)
            : 0;
    });

    public get isReceiving(): boolean {
        return this.receivingFiles().size > 0;
    }
}
