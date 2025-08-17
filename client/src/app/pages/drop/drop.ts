import { Component, ElementRef, inject, OnInit, viewChild } from "@angular/core";
import { RTC } from "@/utils/rtc/rtc";
import { ReactiveFormsModule } from "@angular/forms";
import { Layout } from "@/ui/layout/layout";
import { Socket } from "@/utils/socket/socket";
import { RouterLink } from "@angular/router";
import { Uploader } from "@/utils/uploader/uploader";
import { Modal } from "@/ui/modal/modal";
import { Peer } from "@/ui/peer/peer";

@Component({
    selector: "app-drop",
    imports: [
        ReactiveFormsModule,
        Layout,
        RouterLink,
        Modal,
        Peer,
    ],
    templateUrl: "./drop.html",
    styleUrl: "./drop.scss",
})
export class Drop implements OnInit {
    private readonly socket: Socket = inject(Socket);
    protected readonly rtc: RTC = inject(RTC);
    protected readonly uploader: Uploader = inject(Uploader);
    private readonly addFileElement = viewChild<ElementRef>("addFileRef");
    protected readonly modalRemoveFiles = viewChild<Modal>("modalRemoveFilesRef");

    public ngOnInit(): void {
        this.socket.init();
    }

    protected onRemoveFiles(): void {
        this.uploader.removeFiles();
    }

    protected openFileExplorer(): void {
        this.addFileElement()?.nativeElement.click();
    }

    protected removeFile(index: number): void {
        this.uploader.removeFile(index);
    }

    protected addFiles(event: any): void {
        this.uploader.addFiles(event.currentTarget?.files);
    }
}
