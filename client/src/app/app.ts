import { RouterOutlet } from "@angular/router";
import { Component, HostListener, inject } from "@angular/core";

import { P2P } from "@/utils/p2p/p2p";
import { Session } from "@/utils/session/session";
import { Alert } from "@/utils/alert/alert";

@Component({
    selector: "app-root",
    imports: [RouterOutlet],
    templateUrl: "./app.html",
    styleUrl: "./app.scss",
})
export class App {
    private readonly p2p: P2P = inject<P2P>(P2P);
    private readonly alert: Alert = inject<Alert>(Alert);
    private readonly session: Session = inject<Session>(Session);

    public constructor() {
        this.session.init();
        this.p2p.init();
    }

    @HostListener("document:click")
    @HostListener("document:keydown")
    public unlockSound(): void {
        this.alert.load();
    }
}
