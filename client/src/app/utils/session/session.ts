import { inject, Injectable } from "@angular/core";

import { SessionStorage } from "@/utils/storage/session-storage";
import { Discoverability } from "@/utils/socket/socket-interface";
import animals from "@/utils/session/dict/animals";

enum SessionKey {
    NAME = "NAME",
    PEER_ID = "PEER_ID",
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
}
