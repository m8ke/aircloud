import { inject, Injectable } from "@angular/core";

import { SessionStorage } from "@/utils/storage/session-storage";
import { Discoverability } from "@/utils/socket/socket-interface";
import { animals, uniqueNamesGenerator } from "unique-names-generator";

@Injectable({
    providedIn: "root",
})
export class Session {
    private readonly sessionStorage: SessionStorage = inject(SessionStorage);

    public init(): void {
        if (!this.name) {
            this.name = this.generateName();
        }

        if (!this.discoverability) {
            this.discoverability = Discoverability.NETWORK;
        }
    }

    public get name(): string | null {
        return this.sessionStorage.getItem("name");
    }

    public set name(name: string) {
        this.sessionStorage.setItem("name", name);
    }

    public get peerId(): string | null {
        return this.sessionStorage.getItem("peerId");
    }

    public set peerId(peerId: string) {
        this.sessionStorage.setItem("peerId", peerId);
    }

    public get discoverability(): Discoverability {
        return this.sessionStorage.getItem("discoverability") as Discoverability || Discoverability.NETWORK;
    }

    public set discoverability(discoverability: Discoverability) {
        this.sessionStorage.setItem("discoverability", discoverability);
    }

    private generateName(): string {
        // TODO: It can be replaced with an array of animal names and get one randomized value from there.
        return uniqueNamesGenerator({
            dictionaries: [animals],
            style: "capital",
        });
    }
}
