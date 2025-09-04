import { v4 as uuidv4 } from "uuid";
import { Router } from "@angular/router";
import { computed, inject, Injectable, Signal, signal } from "@angular/core";

import { Env } from "@/utils/env/env";
import { Peer } from "@/utils/p2p/peer";
import { Session } from "@/utils/session/session";
import { SendingFile } from "@/utils/file-manager/sending-file";
import { ConnectionType } from "@/utils/p2p/connection-type";
import { PeerFileMetadata, ReceivingFile } from "@/utils/file-manager/receiving-file";
import { NotificationService, NotificationType } from "@/ui/notification/notification.service";
import { ConnectRequest, SocketRequestType, SocketResponseType } from "@/utils/p2p/p2p-interface";

enum RTCType {
    EOF = "EOF",
    REQUESTED_FILE_SHARE = "REQUESTED_FILE_SHARE",
    ACCEPTED_FILE_SHARE = "ACCEPTED_FILE_SHARE",
    DENIED_FILE_SHARE = "DENIED_FILE_SHARE",
}

@Injectable({
    providedIn: "root",
})
export class P2P {
    private static readonly RECONNECT_DELAY: number = 3000;

    private ws!: WebSocket;
    private readonly env: Env = inject<Env>(Env);
    private readonly router: Router = inject<Router>(Router);
    private readonly session: Session = inject<Session>(Session);
    private readonly notification: NotificationService = inject<NotificationService>(NotificationService);

    private readonly dcs: Map<string, RTCDataChannel> = new Map<string, RTCDataChannel>();
    public readonly pcs = signal<Map<string, Peer>>(new Map<string, Peer>());
    public readonly sendingFiles = signal<Map<string, SendingFile>>(new Map<string, SendingFile>());
    public readonly receivingFiles = signal<Map<string, ReceivingFile>>(new Map<string, ReceivingFile>());

    private static readonly CHUNK_SIZE: number = 64 * 1024;

    public init(): void {
        console.log("[WebSocket] Initialize connection");
        this.ws = new WebSocket(this.env.wsUrl);

        this.ws.onopen = (): void => {
            console.log("[WebSocket] Connection opened");
            this.connectWebSocket();
            this.connectPersistedIds();

            if (this.connectionId) {
                // TODO: It causes "InvalidStateError: Failed to execute 'setLocalDescription' on 'RTCPeerConnection': Failed to set local answer sdp: Called in wrong state: stable"
                this.connectPeer(this.connectionId);
            }
        };

        this.ws.onmessage = async (event): Promise<void> => {
            const data = JSON.parse(event.data);

            switch (data.type as SocketResponseType) {
                case SocketResponseType.CONNECT:
                    return this.handleConnect(data);
                case SocketResponseType.DISCONNECT:
                    return this.handleDisconnect(data);
                case SocketResponseType.OFFER:
                    return this.handleOffer(data);
                case SocketResponseType.ANSWER:
                    return await this.handleAnswer(data);
                case SocketResponseType.APPROVE_ANSWER:
                    return this.handleApproveAnswer(data);
                case SocketResponseType.PEER_CONNECT:
                    return data.isConnected
                        ? this.handlePeerConnectSucceed(data)
                        : this.handlePeerConnectFailed(data);
                case SocketResponseType.ICE_CANDIDATE:
                    return this.handleIceCandidate(data);
                case SocketResponseType.END_OF_ICE_CANDIDATES:
                    return this.handleEndOfIceCandidates(data);
                default:
                    console.log("[WebSocket] Unhandled message received", data);
                    break;
            }
        };

        this.ws.onclose = async (e: CloseEvent): Promise<void> => {
            console.warn(`[WebSocket] Connection closed, retrying in ${P2P.RECONNECT_DELAY} ms`);
            await this.delay(P2P.RECONNECT_DELAY);
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
            throw new Error("[WebSocket] Name or peer ID is not provided");
        }

        this.sendSignal<ConnectRequest>({
            type: SocketRequestType.CONNECT,
            data: {
                name,
                peerId,
                discoverability: this.session.discoverability,
            },
        });
    }

    public connectPeer(connectionId: string): void {
        // TODO: Add an interface
        this.sendSignal<any>({
            type: SocketRequestType.PEER_CONNECT,
            data: {
                connectionId,
            },
        });
    }

    public reestablishConnection(peerId: string): void {
        // TODO: Add an interface
        this.sendSignal<any>({
            type: SocketRequestType.PEER_RECONNECT,
            data: {
                peerId,
            },
        });
    }

    private sendSignal<T>(message: T): void {
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
        this.session.iceServers = data.iceServers;
        this.notification.show({message: "Connected to P2P network"});
    }

    // TODO: Add an interface
    private handleDisconnect(data: any): void {
        console.log(`[Socket] Peer ID ${data.peerId} disconnected`);
        this.closeConnection(data.peerId);
    }

    // TODO: Add an interface
    private async handleOffer(data: any): Promise<void> {
        console.log(`[WebSocket] Received an offer request from peer ID ${data.peerId}`);
        const offer: RTCSessionDescription | null = await this.createOffer(data.peerId, data.name, data.device, data.connectionType);

        this.sendSignal({
            type: SocketRequestType.OFFER,
            data: {
                offer: offer,
                peerId: data.peerId,
                connectionType: data.connectionType,
            },
        });
    }

    // TODO: Add an interface
    private async handleAnswer(data: any): Promise<void> {
        console.log("[WebSocket] Received offer from peer and creating an answer");
        const answer = await this.createAnswer(data.peerId, data.offer, data.name, data.device, data.connectionType);

        this.sendSignal({
            type: SocketRequestType.ANSWER,
            data: {
                answer: answer,
                peerId: data.peerId,
            },
        });
    }

    // TODO: Add an interface
    private async handleApproveAnswer(data: any): Promise<void> {
        console.log(`[WebSocket] Received an answer from the peer ID ${data.peerId}`);
        await this.approveAnswer(data.peerId, data.answer);
    }

    // TODO: Add an interface
    private async handlePeerConnectSucceed(data: any): Promise<void> {
        // TODO: Close modal instead of notification!

        console.log("[WebSocket] Direct connection succeed");
        this.notification.show({
            message: "Connected with a peer",
            type: "success",
        });
    }

    // TODO: Add an interface
    private handlePeerConnectFailed(data: any): void {
        console.log("[WebSocket] Direct connection failed");
        this.notification.show({
            message: "Wrong ID or peer is not online",
            type: "error",
        });
    }

    private connectPersistedIds(): void {
        for (const peerId of this.session.connectedPeerIds) {
            if (!this.pcs().get(peerId)) {
                this.reestablishConnection(peerId);
            }
        }
    }

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

        const pc: RTCPeerConnection = new RTCPeerConnection(this.session.iceServers);

        pc.onconnectionstatechange = (): void => {
            const cs: RTCPeerConnectionState = pc.connectionState;

            if (cs === "failed" || cs === "closed" || cs === "disconnected") {
                console.warn(`[WebRTC] PC state changed to ${cs} for peer ID ${peerId}`);
                this.closeConnection(peerId);
            }
        };

        pc.oniceconnectionstatechange = () => {
            console.log(`[WebRTC] ICE state for peer ID ${peerId}: ${pc.iceConnectionState}`);
        };

        pc.onsignalingstatechange = () => {
            console.log(`[WebRTC] Signaling state for peer ID ${peerId}: ${pc.signalingState}`);
        };

        pc.onicecandidate = (event: RTCPeerConnectionIceEvent): void => {
            if (event.candidate) {
                this.sendSignal({
                    type: SocketRequestType.ICE_CANDIDATE,
                    data: {
                        peerId,
                        candidate: event.candidate.toJSON(),
                    },
                });
            } else {
                this.sendSignal({
                    type: SocketRequestType.END_OF_ICE_CANDIDATES,
                    data: {
                        peerId,
                    },
                });
            }
        };

        // TODO: Do not add until "cs == connected"
        this.pcs.update(prev => {
            const next = new Map(prev);
            next.set(peerId, new Peer(pc, name, device));
            return next;
        });

        if (connectionType == ConnectionType.MANUAL) {
            this.session.addConnectedPeerId(peerId);
        }

        return pc;
    }

    private filterHostCandidates(sdp: string): string {
        return sdp
            .split("\n")
            .filter(line => {
                if (!line.startsWith("a=candidate:")) return true;
                return line.includes(" typ host");
            })
            .join("\n");
    }

    public async createOffer(peerId: string, name: string, device: string, connectionType: ConnectionType): Promise<RTCSessionDescription | null> {
        const pc: RTCPeerConnection = this.establishPeerConnection(peerId, name, device, connectionType);
        const dc: RTCDataChannel = pc.createDataChannel(uuidv4());

        dc.bufferedAmountLowThreshold = P2P.CHUNK_SIZE;
        this.setupDataChannel(peerId, dc);

        const offer: RTCSessionDescriptionInit = await pc.createOffer();
        await pc.setLocalDescription(offer);

        if (pc.localDescription) {
            return {
                type: pc.localDescription.type,
                sdp: this.filterHostCandidates(pc.localDescription.sdp!),
            } as RTCSessionDescription;
        }

        return null;
    }

    /**
     * Create an answer according to the offer.
     *
     * @param peerId peer ID with which the connection will be established
     * @param offer offer from another peer
     * @param name peer's name
     * @param device peer's device OS family
     * @param connectionType
     */
    public async createAnswer(peerId: string, offer: RTCSessionDescription, name: string, device: string, connectionType: ConnectionType): Promise<RTCSessionDescription | null> {
        const pc: RTCPeerConnection = this.establishPeerConnection(peerId, name, device, connectionType);

        pc.ondatachannel = (event: RTCDataChannelEvent): void => {
            this.setupDataChannel(peerId, event.channel);
        };

        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const peer: Peer | undefined = this.pcs().get(peerId);

        if (peer?.candidates) {
            for (const candidate of peer.candidates) {
                if (candidate && candidate.candidate) await pc.addIceCandidate(candidate).catch(console.error);
            }
            peer.candidates = [];
        }

        const answer: RTCSessionDescriptionInit = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        console.log(`[WebRTC] Created an answer for peer ID ${peerId}`);
        if (pc.localDescription) {
            return {
                type: pc.localDescription.type,
                sdp: this.filterHostCandidates(pc.localDescription.sdp!),
            } as RTCSessionDescription;
        }
        return null;
    }

    /**
     * Approve the answer that was received from the other peer.
     *
     * @param peerId peer ID with which the connection will be established
     * @param answer answer from another peer
     */
    public async approveAnswer(peerId: string, answer: RTCSessionDescription): Promise<void> {
        const peer: Peer | undefined = this.pcs().get(peerId);
        const pc: RTCPeerConnection | undefined = peer?.pc;

        if (!pc) {
            throw new Error(`[WebRTC] No RTCPeerConnection for peer ID ${peerId}`);
        }

        if (pc.signalingState === "have-local-offer") {
            await pc.setRemoteDescription(answer);
        } else {
            console.warn(`[WebRTC] Ignored answer for ${peerId}, state: ${pc.signalingState}`);
            return;
        }

        if (peer?.candidates?.length) {
            for (const c of peer.candidates) {
                if (c && c.candidate) {
                    await pc.addIceCandidate(new RTCIceCandidate(c)).catch(console.error);
                }
            }
            peer.candidates = [];
        }
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
        if (peerId == null) {
            return;
        }

        console.warn(`[WebRTC] Closing peer ID ${peerId} connection`);
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
            const slice: Blob = file.file.slice(offset, offset + P2P.CHUNK_SIZE);
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

            offset += P2P.CHUNK_SIZE;
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
        if (dc.bufferedAmount <= P2P.CHUNK_SIZE) {
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

    private handleDataChannelOpen(peerId: string): void {
        console.log(`[WebRTC] DC open on connection with peer ID ${peerId}`);
    }

    private handleDataChannelClose(peerId: string): void {
        console.warn(`[WebRTC] DC closed on connection with peer ID ${peerId}`);
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
                : await data.arrayBuffer();

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

    public readonly progress: Signal<number> = computed((): number => {
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

    private async handleIceCandidate(data: any): Promise<void> {
        const pc: RTCPeerConnection | undefined = this.pcs().get(data.peerId)?.pc;
        const peer: Peer | undefined = this.pcs().get(data.peerId);

        if (!pc || !peer) {
            return;
        }

        if (pc.remoteDescription) {
            await pc.addIceCandidate(data.candidate).catch(console.error);
        } else {
            peer.candidates = peer.candidates || [];
            peer.candidates.push(data.candidate);
        }
    }

    private async handleEndOfIceCandidates(data: any): Promise<void> {
        const pc: RTCPeerConnection | undefined = this.pcs().get(data.peerId)?.pc;

        if (pc) {
            await pc.addIceCandidate(null);
        }
    }

    private get connectionId(): string | null {
        return this.router.routerState.snapshot.root.firstChild?.paramMap.get("connectionId") ?? null;
    }
}
