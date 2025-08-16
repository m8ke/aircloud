import { Component, inject, OnInit, viewChild } from "@angular/core";
import { RTC } from "@/utils/rtc/rtc";
import { ReactiveFormsModule } from "@angular/forms";
import { Layout } from "@/ui/layout/layout";
import { Socket } from "@/utils/socket/socket";
import { RouterLink } from "@angular/router";
import { Uploader } from "@/utils/uploader/uploader";
import { Modal } from "@/ui/modal/modal";

@Component({
    selector: "app-drop",
    imports: [
        ReactiveFormsModule,
        Layout,
        RouterLink,
        Modal,
    ],
    templateUrl: "./drop.html",
    styleUrl: "./drop.scss",
})
export class Drop implements OnInit {
    private readonly socket: Socket = inject(Socket);
    protected readonly rtc: RTC = inject(RTC);
    protected readonly uploader: Uploader = inject(Uploader);
    protected readonly modalRemoveFile = viewChild<Modal>("modalRemoveFileRef");
    protected readonly modalRemoveFiles = viewChild<Modal>("modalRemoveFilesRef");

    public ngOnInit(): void {
        this.socket.init();
    }

    public onClearFiles(): void {
        this.uploader.clearFiles();
    }

    public onRemoveFile(index: number): void {
        this.uploader.removeFile(index);
    }
}
