import { inject, Injectable } from "@angular/core";

import animals from "@/utils/session/dict/animals";
import { SessionStorage } from "@/utils/storage/session-storage";
import { Discoverability } from "@/utils/socket/socket-interface";

enum SessionKey {
    NAME = "NAME",
    PEER_ID = "PEER_ID",
    CONNECTION_ID = "CONNECTION_ID",
    DISCOVERABILITY = "DISCOVERABILITY",
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

        if (!this.connectionId) {
            this.connectionId = this.generateConnectionId(6);
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

    private generateName(): string {
        return animals[this.randomInt(0, animals.length - 1)];
    }

    private randomInt(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    public generateConnectionId(n: number = 6): string {
        // min 62^6
        const c: string = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        return [...Array(n)].map(_ => c[~~(Math.random() * c.length)]).join("");
    }
}
