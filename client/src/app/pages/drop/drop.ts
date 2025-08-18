import { ChangeDetectionStrategy, Component, ElementRef, inject, OnInit, viewChild } from "@angular/core";
import { RTC } from "@/utils/rtc/rtc";
import { ReactiveFormsModule } from "@angular/forms";
import { Layout } from "@/ui/layout/layout";
import { Socket } from "@/utils/socket/socket";
import { Uploader } from "@/utils/uploader/uploader";
import { Modal } from "@/ui/modal/modal";
import { Peer } from "@/ui/peer/peer";
import { KeyValuePipe } from "@angular/common";

@Component({
    selector: "app-drop",
    imports: [
        ReactiveFormsModule,
        Layout,
        Modal,
        Peer,
        KeyValuePipe,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: "./drop.html",
    styleUrl: "./drop.scss",
})
export class Drop implements OnInit {
    private readonly socket: Socket = inject<Socket>(Socket);
    protected readonly rtc: RTC = inject<RTC>(RTC);
    protected readonly uploader: Uploader = inject<Uploader>(Uploader);

    protected readonly addFileElement = viewChild<ElementRef>("addFileRef");
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

    protected selectFile(): void {
        // TODO: Select file to send only selected files (not all together)
    }

    protected async sendFilesToPeer(peerId: string): Promise<void> {
        this.rtc.requestFileSending(peerId, this.uploader.files());
    }

    public isLoading(peerId: string): boolean {
        if (this.getProgress(peerId) >= 100) {
            return false;
        }

        return !!this.rtc.sendingProgress().get(peerId);
    }

    public getProgress(peerId: string): number {
        return Number((((this.rtc.sendingProgress().get(peerId)?.sentSize ?? 0) / (this.rtc.sendingProgress().get(peerId)?.totalSize ?? 0)) * 100).toFixed(0));
    }
}
