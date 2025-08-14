import { Component, inject, OnInit } from "@angular/core";
import { RTC } from "@/utils/rtc/rtc";
import { ReactiveFormsModule } from "@angular/forms";
import { Layout } from "@/ui/layout/layout";
import { Socket } from "@/utils/socket/socket";

@Component({
    selector: "app-drop",
    imports: [
        ReactiveFormsModule,
        Layout,
    ],
    templateUrl: "./drop.html",
    styleUrl: "./drop.scss",
})
export class Drop implements OnInit {
    protected readonly rtc: RTC = inject(RTC);
    protected readonly socket: Socket = inject(Socket);

    public async ngOnInit(): Promise<void> {
        this.socket.init();
    }
}
