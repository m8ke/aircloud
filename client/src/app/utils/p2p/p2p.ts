import { v4 as uuidv4 } from "uuid";
import { Router } from "@angular/router";
import { Location } from "@angular/common";
import { computed, inject, Injectable, Signal, signal } from "@angular/core";

import { Env } from "@/utils/env/env";
import { Peer } from "@/utils/p2p/peer";
import { Session } from "@/utils/session/session";
import { RTCType } from "@/utils/p2p/rtc-type";
import { SendingFile } from "@/utils/file-manager/sending-file";
import { ModalService } from "@/utils/modal/modal";
import { DiscoveryMode } from "@/utils/p2p/discovery-mode";
import { PeerFileMetadata, ReceivingFile } from "@/utils/file-manager/receiving-file";
import { RtcPayload, RtcPeerDataChanges, RtcRequestedFileShare } from "@/utils/p2p/rtc-payload";
import { NotificationResult, NotificationService, NotificationType } from "@/ui/notification/notification.service";

import {
    SocketChangeSettingsRequest,
    SocketConnectRequest,
    SocketPeerConnectRequest,
    SocketPeerReconnectRequest,
    SocketRequestType,
} from "@/utils/p2p/socket-request";

import {
    SocketAnswer,
    SocketApproveAnswer,
    SocketConnect,
    SocketDisconnect,
    SocketEndOfIceCandidates,
    SocketIceCandidate,
    SocketOffer,
    SocketPeerDirectConnect,
    SocketPingPong,
    SocketResponseType,
} from "@/utils/p2p/socket-response";

@Injectable({
    providedIn: "root",
})
export class P2P {
    private static readonly CHUNK_SIZE: number = 64 * 1024;
    private static readonly RECONNECT_DELAY: number = 3000;

    private ws!: WebSocket;
    private readonly env: Env = inject<Env>(Env);
    private readonly modal: ModalService = inject<ModalService>(ModalService);
    private readonly router: Router = inject<Router>(Router);
    private readonly session: Session = inject<Session>(Session);
    private readonly location: Location = inject<Location>(Location);
    private readonly notification: NotificationService = inject<NotificationService>(NotificationService);

    private readonly dcs: Map<string, RTCDataChannel> = new Map<string, RTCDataChannel>();
    public readonly pcs = signal<Map<string, Peer>>(new Map<string, Peer>());
    public readonly isConnected = signal<boolean>(true);
    public readonly sendingFiles = signal<Map<string, SendingFile>>(new Map<string, SendingFile>());
    public readonly receivingFiles = signal<Map<string, ReceivingFile>>(new Map<string, ReceivingFile>());

    public init(): void {
        console.log("[WebSocket] Initialize connection");
        this.ws = new WebSocket(this.env.wsUrl);

        this.ws.onopen = (): void => {
            console.log("[WebSocket] Connection opened");

            this.dcs.clear();
            this.pcs.set(new Map<string, Peer>());
            this.isConnected.set(true);

            this.connectWebSocket();
            this.connectPersistedIds();

            if (this.routerConnectionId) {
                // TODO: It causes "InvalidStateError: Failed to execute 'setLocalDescription' on 'RTCPeerConnection': Failed to set local answer sdp: Called in wrong state: stable"
                this.connectPeer(this.routerConnectionId);
                this.location.replaceState("/");
            }
        };

        this.ws.onmessage = async (event: MessageEvent<any>): Promise<void> => {
            const data = JSON.parse(event.data);

            switch (data.type as SocketResponseType) {
                case SocketResponseType.CONNECT:
                    return this.handleConnect(data as SocketConnect);
                case SocketResponseType.DISCONNECT:
                    return this.handleDisconnect(data as SocketDisconnect);
                case SocketResponseType.PING_PONG:
                    return this.handlePingPong(data as SocketPingPong);
                case SocketResponseType.OFFER:
                    return this.handleOffer(data as SocketOffer);
                case SocketResponseType.ANSWER:
                    return await this.handleAnswer(data as SocketAnswer);
                case SocketResponseType.APPROVE_ANSWER:
                    return this.handleApproveAnswer(data as SocketApproveAnswer);
                case SocketResponseType.PEER_CONNECT:
                    return (data as SocketPeerDirectConnect).isConnected
                        ? this.handlePeerConnectSucceed()
                        : this.handlePeerConnectFailed();
                case SocketResponseType.ICE_CANDIDATE:
                    return this.handleIceCandidate(data as SocketIceCandidate);
                case SocketResponseType.END_OF_ICE_CANDIDATES:
                    return this.handleEndOfIceCandidates(data as SocketEndOfIceCandidates);
                default:
                    console.log("[WebSocket] Unhandled message received", data);
                    break;
            }
        };

        this.ws.onclose = async (): Promise<void> => {
            console.warn(`[WebSocket] Connection closed, retrying in ${P2P.RECONNECT_DELAY} ms`);
            this.isConnected.set(false);
            await this.delay(P2P.RECONNECT_DELAY);
            this.init();
        };

        this.ws.onerror = (event: Event): void => {
            console.log("[WebSocket] Connection error", event);
            this.isConnected.set(false);
            this.ws.close();
        };
    }

    private connectWebSocket(): void {
        const name: string | null = this.session.name;
        const authToken: string | null = this.session.authToken;

        if (!name) {
            throw new Error("[WebSocket] Name is required");
        }

        this.sendSocketSignal<SocketConnectRequest>({
            type: SocketRequestType.CONNECT,
            data: {
                name,
                authToken,
                discoveryMode: this.session.discoveryMode,
            },
        });
    }

    public changeSettings(): void {
        const name: string | null = this.session.name;
        const authToken: string | null = this.session.authToken;

        if (!name || !authToken) {
            throw new Error("[WebSocket] Name and auth token is required");
        }

        this.sendSocketSignal<SocketChangeSettingsRequest>({
            type: SocketRequestType.CHANGE_SETTINGS,
            data: {
                name,
                authToken,
                discoveryMode: this.session.discoveryMode,
            },
        });

        this.populateChangesToConnectedPeers(name);
    }

    public connectPeer(connectionId: string): void {
        this.sendSocketSignal<SocketPeerConnectRequest>({
            type: SocketRequestType.PEER_CONNECT,
            data: {
                connectionId,
            },
        });
    }

    public reestablishConnection(peerId: string): void {
        this.sendSocketSignal<SocketPeerReconnectRequest>({
            type: SocketRequestType.PEER_RECONNECT,
            data: {
                peerId,
            },
        });
    }

    private sendSocketSignal<T>(message: T): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }

    private delay(n: number): Promise<void> {
        return new Promise<void>((resolve): void => {
            setTimeout(resolve, n);
        });
    }

    private handleConnect(data: SocketConnect): void {
        this.session.peerId = data.peerId;
        this.session.authToken = data.authToken;
        this.session.iceServers = data.iceServers;
        this.session.connectionId = data.connectionId;
        this.notification.show({message: "Connected to P2P network"});
    }

    private handleDisconnect(data: SocketDisconnect): void {
        console.log(`[Socket] Peer ID ${data.peerId} disconnected`);
        this.closeConnection(data.peerId);
    }

    private handlePingPong(data: SocketPingPong): void {
        console.log("[Socket] Received ping");
        this.session.iceServers = data.iceServers;
        this.session.authToken = data.authToken;
    }

    private async handleOffer(data: SocketOffer): Promise<void> {
        console.log(`[WebSocket] Received an offer request from peer ID ${data.peerId}`);
        const offer: RTCSessionDescription | null = await this.createOffer(data.peerId, data.name, data.device, data.discoveryMode);

        this.sendSocketSignal({
            type: SocketRequestType.OFFER,
            data: {
                offer: offer,
                peerId: data.peerId,
                discoveryMode: data.discoveryMode,
            },
        });
    }

    private async handleAnswer(data: SocketAnswer): Promise<void> {
        console.log("[WebSocket] Received offer from peer and creating an answer");
        const answer: RTCSessionDescription | null = await this.createAnswer(data.peerId, data.offer, data.name, data.device, data.discoveryMode);

        this.sendSocketSignal({
            type: SocketRequestType.ANSWER,
            data: {
                answer: answer,
                peerId: data.peerId,
            },
        });
    }

    private async handleApproveAnswer(data: SocketApproveAnswer): Promise<void> {
        console.log(`[WebSocket] Received an answer from the peer ID ${data.peerId}`);
        await this.approveAnswer(data.peerId, data.answer);
    }

    private async handlePeerConnectSucceed(): Promise<void> {
        console.log("[WebSocket] Direct connection succeed");
        this.notification.show({message: "Connected with a peer"});
        this.modal.close("connectPeer");
    }

    private handlePeerConnectFailed(): void {
        console.log("[WebSocket] Direct connection failed");
        this.notification.show({message: "Wrong ID or peer is not online"});
    }

    private connectPersistedIds(): void {
        for (const peerId of this.session.connectedPeerIds) {
            if (!this.pcs().get(peerId)) {
                this.reestablishConnection(peerId);
            }
        }
    }

    private establishPeerConnection(peerId: string, name: string, device: string, discoveryMode: DiscoveryMode): RTCPeerConnection {
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

        pc.oniceconnectionstatechange = (): void => {
            console.log(`[WebRTC] ICE state for peer ID ${peerId}: ${pc.iceConnectionState}`);
        };

        pc.onsignalingstatechange = (): void => {
            console.log(`[WebRTC] Signaling state for peer ID ${peerId}: ${pc.signalingState}`);
        };

        pc.onicecandidate = (event: RTCPeerConnectionIceEvent): void => {
            if (event.candidate) {
                this.sendSocketSignal({
                    type: SocketRequestType.ICE_CANDIDATE,
                    data: {
                        peerId,
                        candidate: event.candidate.toJSON(),
                    },
                });
            } else {
                this.sendSocketSignal({
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

        if (discoveryMode == DiscoveryMode.DIRECT) {
            this.session.addConnectedPeerId(peerId);
        }

        return pc;
    }

    public async createOffer(peerId: string, name: string, device: string, discoveryMode: DiscoveryMode): Promise<RTCSessionDescription | null> {
        const pc: RTCPeerConnection = this.establishPeerConnection(peerId, name, device, discoveryMode);
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

    public async createAnswer(peerId: string, offer: RTCSessionDescription, name: string, device: string, discoveryMode: DiscoveryMode): Promise<RTCSessionDescription | null> {
        const pc: RTCPeerConnection = this.establishPeerConnection(peerId, name, device, discoveryMode);

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

    private setupDataChannel(peerId: string, dc: RTCDataChannel): void {
        this.dcs.set(peerId, dc);
        dc.onopen = () => this.handleDataChannelOpen(peerId);
        dc.onclose = () => this.handleDataChannelClose(peerId);
        dc.onmessage = async (event: MessageEvent<any>): Promise<void> => await this.handleDataChannelMessage(event, dc);
    }

    private sendDataChannelSignal<T>(dc: RTCDataChannel, data: T): void {
        dc.send(JSON.stringify(data));
    }

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
                return this.handleRequestedFileShare(dc, data as RtcRequestedFileShare);
            case RTCType.ACCEPTED_FILE_SHARE:
                return this.handleAcceptedFileShare(dc);
            case RTCType.DENIED_FILE_SHARE:
                return this.handleDeniedFileShare(dc);
            case RTCType.EOF:
                return this.handleEndOfFile(dc);
            case RTCType.PEER_DATA_CHANGES:
                return this.handlePeerDataChanges(dc, data as RtcPeerDataChanges);
        }
    }

    private handleRequestedFileShare(dc: RTCDataChannel, data: RtcRequestedFileShare): void {
        const peerId: string = this.getPeerIdByDataChannel(dc);
        const name: string = data.name;
        const metadata: PeerFileMetadata = data.metadata;

        console.log(`[WebRTC] Peer ID ${peerId} requested to send file ${metadata.name}`);

        this.notification.show({name, metadata}, NotificationType.FILE_REQUEST).subscribe({
            next: (result: NotificationResult): void => {
                if (result == NotificationResult.ACCEPT) {
                    this.receivingFiles.update(prev => {
                        const next = new Map(prev);
                        next.set(dc.label, new ReceivingFile(metadata));
                        return next;
                    });

                    this.acceptedFileSharing(dc, new ReceivingFile(metadata));
                } else {
                    this.sendDataChannelSignal<RtcPayload>(dc, {
                        type: RTCType.DENIED_FILE_SHARE,
                    });
                }
            },
        });
    }

    private async handleAcceptedFileShare(dc: RTCDataChannel): Promise<void> {
        const peerId: string = this.getPeerIdByDataChannel(dc);
        const file: SendingFile | undefined = this.sendingFiles().get(peerId);

        if (file) {
            await this.sendFile(peerId, dc, file);
        }
    }

    private handleDeniedFileShare(dc: RTCDataChannel): void {
        // TODO: Show notification about denied request (maybe not)
        //       Remove pending files when peerId is disconnected as well (in another method)
        console.log("[WebRTC] Denied file share");
        this.removePendingFilesByPeerId(this.getPeerIdByDataChannel(dc));
    }

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

        this.sendDataChannelSignal<RtcRequestedFileShare>(dc, {
            type: RTCType.REQUESTED_FILE_SHARE,
            name: this.session.name,
            metadata: {
                name: file.name,
                size: file.size,
                type: file.type,
            },
        });
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

        this.sendDataChannelSignal<RtcPayload>(dc, {
            type: RTCType.ACCEPTED_FILE_SHARE,
        });
    }

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

        this.sendDataChannelSignal<RtcPayload>(dc, {
            type: RTCType.EOF,
        });

        console.log(`[WebRTC] File "${file.file.name}" sent to peer ID ${peerId}`);
        this.removePendingFilesByPeerId(peerId);
    }

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

    private async handleIceCandidate(data: SocketIceCandidate): Promise<void> {
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

    private async handleEndOfIceCandidates(data: SocketEndOfIceCandidates): Promise<void> {
        const pc: RTCPeerConnection | undefined = this.pcs().get(data.peerId)?.pc;

        if (pc) {
            await pc.addIceCandidate(null);
        }
    }

    private populateChangesToConnectedPeers(name: string): void {
        this.dcs.forEach((dc: RTCDataChannel): void => {
            this.sendDataChannelSignal<RtcPeerDataChanges>(dc, {
                type: RTCType.PEER_DATA_CHANGES,
                name,
            });
        });
    }

    private handlePeerDataChanges(dc: RTCDataChannel, data: RtcPeerDataChanges): void {
        const peerId: string = this.getPeerIdByDataChannel(dc);

        this.pcs.update(prev => {
            const next = new Map(prev);
            const peer = next.get(peerId);

            if (peer) {
                peer.name = data.name;
                next.set(peerId, peer);
            }

            return next;
        });
    }

    //
    // Helpers
    //

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

    public removePendingFilesByPeerId(peerId: string): void {
        this.sendingFiles.update(prev => {
            const next = new Map(prev);
            next.delete(peerId);
            return next;
        });
    }

    private getPeerIdByDataChannel(dc: RTCDataChannel): string {
        const entry = [...this.dcs.entries()].find(([_, channel]) => channel === dc);

        if (!entry) {
            throw new Error("DataChannel not found in the map");
        }

        return entry[0];
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

    public get isReceiving(): boolean {
        return this.receivingFiles().size > 0;
    }

    private get routerConnectionId(): string | null {
        return this.router.routerState.snapshot.root.firstChild?.paramMap.get("connectionId") ?? null;
    }
}
