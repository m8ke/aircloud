import { Component, inject, OnInit } from "@angular/core";
import { RTC } from "@/utils/rtc/rtc";
import { ReactiveFormsModule } from "@angular/forms";
import { Layout } from "@/ui/layout/layout";
import { Socket } from "@/utils/socket/socket";
import { RouterLink } from "@angular/router";

@Component({
    selector: "app-drop",
    imports: [
        ReactiveFormsModule,
        Layout,
        RouterLink,
    ],
    templateUrl: "./drop.html",
    styleUrl: "./drop.scss",
})
export class Drop implements OnInit {
    protected readonly rtc: RTC = inject(RTC);
    private readonly socket: Socket = inject(Socket);

    public async ngOnInit(): Promise<void> {
        this.socket.init();
    }

    public getBorderColor(n: number): string {
        const opacity = Math.min(((100 / n * 0.25) / 100));
        return `rgba(255,255,255,${opacity})`;
    }
}
