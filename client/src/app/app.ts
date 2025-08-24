import { RouterOutlet } from "@angular/router";
import { Component, inject } from "@angular/core";

import { Socket } from "@/utils/socket/socket";
import { Session } from "@/utils/session/session";

@Component({
    selector: "app-root",
    imports: [RouterOutlet],
    templateUrl: "./app.html",
    styleUrl: "./app.scss",
})
export class App {
    private readonly socket: Socket = inject<Socket>(Socket);
    private readonly session: Session = inject<Session>(Session);

    public constructor() {
        this.session.init();
        this.socket.init();
    }
}
