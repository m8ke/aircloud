import { v4 as uuidv4 } from "uuid";
import { inject, Injectable } from "@angular/core";

import animals from "@/utils/session/dict/animals";
import { SessionStorage } from "@/utils/storage/session-storage";
import { Discoverability } from "@/utils/socket/socket-interface";

enum SessionKey {
    NAME = "NAME",
    PEER_ID = "PEER_ID",
    CONNECTION_ID = "CONNECTION_ID",
    DISCOVERABILITY = "DISCOVERABILITY",
    CONNECTED_PEER_IDS = "CONNECTED_PEER_IDS",
}

@Injectable({
    providedIn: "root",
})
export class Session {
    private readonly sessionStorage: SessionStorage = inject<SessionStorage>(SessionStorage);

    public init(): void {
        if (!this.peerId) {
            this.peerId = uuidv4();
        }

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
}
