import { RouterOutlet } from "@angular/router";
import { Component, inject, OnInit } from "@angular/core";
import { animals, uniqueNamesGenerator } from "unique-names-generator";

import { Socket } from "@/utils/socket/socket";
import { Session } from "@/utils/session/session";
import { Discoverability } from "@/utils/socket/socket-interface";

@Component({
    selector: "app-root",
    imports: [RouterOutlet],
    templateUrl: "./app.html",
    styleUrl: "./app.scss",
})
export class App implements OnInit {
    private readonly socket: Socket = inject<Socket>(Socket);
    private readonly session: Session = inject<Session>(Session);

    public constructor() {
        this.socket.init();
    }

    public ngOnInit(): void {
        if (!this.session.name) {
            this.session.name = this.generateName();
        }

        if (!this.session.discoverability) {
            this.session.discoverability = Discoverability.NETWORK;
        }
    }

    private generateName(): string {
        // TODO: It can be replaced with an array of animal names and get one randomized value from there.
        return uniqueNamesGenerator({
            dictionaries: [animals],
            style: "capital",
        });
    }
}
