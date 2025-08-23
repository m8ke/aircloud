import { ChangeDetectionStrategy, Component, ElementRef, inject, viewChild } from "@angular/core";
import { RTC } from "@/utils/rtc/rtc";
import { ReactiveFormsModule } from "@angular/forms";
import { Layout } from "@/ui/layout/layout";
import { FileManager } from "@/utils/file-manager/file-manager.service";
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
export class Drop {
    protected readonly rtc: RTC = inject<RTC>(RTC);
    protected readonly uploader: FileManager = inject<FileManager>(FileManager);

    protected readonly addFileElement = viewChild<ElementRef>("addFileRef");
    protected readonly modalRemoveFiles = viewChild<Modal>("modalRemoveFilesRef");

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
