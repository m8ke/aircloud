import { Component, inject, OnInit } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { Toast } from "@/ui/toast/toast";
import { animals, uniqueNamesGenerator } from "unique-names-generator";
import { SessionStorage } from "@/utils/storage/session-storage";
import { LocalStorage } from "@/utils/storage/local-storage";
import { Socket } from "@/utils/socket/socket";
import { Discoverability } from "@/utils/socket/socket-interface";

@Component({
    selector: "app-root",
    imports: [RouterOutlet, Toast],
    templateUrl: "./app.html",
    styleUrl: "./app.scss",
})
export class App implements OnInit {
    private readonly socket: Socket = inject<Socket>(Socket);
    private readonly sessionStorage: SessionStorage = inject<LocalStorage>(SessionStorage);

    public constructor() {
        this.socket.init();
    }

    public ngOnInit(): void {
        if (!this.sessionStorage.getItem("name")) {
            this.sessionStorage.setItem("name", this.generateName());
        }

        if (!this.sessionStorage.getItem("discoverability")) {
            this.sessionStorage.setItem("discoverability", Discoverability.NETWORK);
        }
    }

    private generateName(): string {
        // TODO: It can be replaced with an array of animal names and get one randomized value from there.
        return uniqueNamesGenerator({
            dictionaries: [animals],
            style: "capital"
        });
    }
}
