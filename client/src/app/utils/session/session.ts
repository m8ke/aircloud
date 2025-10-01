import { inject, Injectable } from "@angular/core";

import animals from "@/utils/session/dict/animals";
import { SessionStorage } from "@/utils/storage/session-storage";
import { Discoverability } from "@/utils/p2p/p2p-interface";

enum SessionKey {
    NAME = "NAME",
    PEER_ID = "PEER_ID",
    AUTH_TOKEN = "AUTH_TOKEN",
    CONNECTION_ID = "CONNECTION_ID",
    DISCOVERABILITY = "DISCOVERABILITY",
    CONNECTED_PEER_IDS = "CONNECTED_PEER_IDS",
    ICE_SERVERS = "ICE_SERVERS",
}

export interface IceServer {
    urls: string;
    username?: string;
    credential?: string;
}

@Injectable({
    providedIn: "root",
})
export class Session {
    private readonly sessionStorage: SessionStorage = inject<SessionStorage>(SessionStorage);

    public init(): void {
        if (!this.name) {
            this.name = this.generateName();
        }

        if (!this.discoverability) {
            this.discoverability = Discoverability.NETWORK;
        }
    }

    public get name(): string | null {
        return this.sessionStorage.getItem(SessionKey.NAME);
    }

    public set name(name: string) {
        this.sessionStorage.setItem(SessionKey.NAME, name);
    }

    public get peerId(): string | null {
        return this.sessionStorage.getItem(SessionKey.PEER_ID);
    }

    public set peerId(peerId: string) {
        this.sessionStorage.setItem(SessionKey.PEER_ID, peerId);
    }

    public get authToken(): string | null {
        return this.sessionStorage.getItem(SessionKey.AUTH_TOKEN);
    }

    public set authToken(authToken: string) {
        this.sessionStorage.setItem(SessionKey.AUTH_TOKEN, authToken);
    }

    public get connectionId(): string | null {
        return this.sessionStorage.getItem(SessionKey.CONNECTION_ID);
    }

    public set connectionId(connectionId: string) {
        this.sessionStorage.setItem(SessionKey.CONNECTION_ID, connectionId);
    }

    public get discoverability(): Discoverability {
        return this.sessionStorage.getItem(SessionKey.DISCOVERABILITY) as Discoverability || Discoverability.NETWORK;
    }

    public set discoverability(discoverability: Discoverability) {
        this.sessionStorage.setItem(SessionKey.DISCOVERABILITY, discoverability);
    }

    public get connectedPeerIds(): string[] {
        const ids = sessionStorage.getItem(SessionKey.CONNECTED_PEER_IDS);
        return ids ? JSON.parse(ids) : [];
    }

    public set connectedPeerIds(connectedPeerIds: string[]) {
        sessionStorage.setItem(SessionKey.CONNECTED_PEER_IDS, JSON.stringify(connectedPeerIds));
    }

    public addConnectedPeerId(connectionId: string): void {
        const ids: string[] = this.connectedPeerIds;

        if (!ids.includes(connectionId)) {
            ids.push(connectionId);
            this.connectedPeerIds = ids;
        }
    }

    public removeConnectedPeerId(connectionId: string): void {
        this.connectedPeerIds = this.connectedPeerIds.filter(id => id !== connectionId);
    }

    private generateName(): string {
        return animals[this.randomInt(0, animals.length - 1)];
    }

    private randomInt(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // TODO: Add an interface
    public set iceServers(iceServers: any) {
        if (iceServers) {
            this.sessionStorage.setItem(SessionKey.ICE_SERVERS, iceServers);
        }
        this.sessionStorage.removeItem(SessionKey.ICE_SERVERS);
    }

    public get iceServers(): { iceServers: IceServer[] } {
        const iceServers = this.sessionStorage.getItem(SessionKey.ICE_SERVERS) as IceServer[] | null;

        if (iceServers == null) {
            console.warn("[Session] ICE servers not found, fallback to public STUN server");

            return {
                iceServers: [
                    {urls: "stun:stun.l.google.com:19302"},
                ],
            };
        }

        console.log("[Session] Found ICE servers");

        return {
            iceServers,
        };
    }
}
