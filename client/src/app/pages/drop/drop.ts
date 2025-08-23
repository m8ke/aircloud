import { ChangeDetectionStrategy, Component, ElementRef, inject, viewChild } from "@angular/core";
import { RTC } from "@/utils/rtc/rtc";
import { ReactiveFormsModule } from "@angular/forms";
import { Layout } from "@/ui/layout/layout";
import { FileManager } from "@/utils/file-manager/file-manager.service";
import { Modal } from "@/ui/modal/modal";
import { Peer } from "@/ui/peer/peer";
import { KeyValuePipe } from "@angular/common";
import { PendingFile } from "@/utils/rtc/pending-file";

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
    protected readonly fileManager: FileManager = inject<FileManager>(FileManager);

    protected readonly addFileElement = viewChild<ElementRef>("addFileRef");
    protected readonly modalRemoveFiles = viewChild<Modal>("modalRemoveFilesRef");

    protected onRemoveFiles(): void {
        this.fileManager.removeFiles();
    }

    protected openFileExplorer(): void {
        this.addFileElement()?.nativeElement.click();
    }

    protected removeFile(index: number): void {
        this.fileManager.removeFile(index);
    }

    protected addFiles(event: any): void {
        this.fileManager.addFiles(event.currentTarget?.files);
    }

    protected selectFile(): void {
        // TODO: Select file to send only selected files (not all together)
    }

    protected async sendFilesToPeer(peerId: string): Promise<void> {
        this.rtc.requestFileSending(peerId, this.fileManager.files());
    }

    protected isLoading(peerId: string): boolean {
        const files: PendingFile[] | undefined = this.rtc.pendingFiles().get(peerId);

        if (!files || files.length === 0) {
            return false;
        }

        return files.some(file => !file.complete);
    }

    protected getProgress(peerId: string): number {
        const files = this.rtc.pendingFiles().get(peerId);

        if (!files || files.length === 0) {
            return 0;
        }

        const totalSize: number = files.reduce((sum, f) => sum + f.file.size, 0);
        const sentSize: number = files.reduce((sum, f) => sum + f.receivedSize, 0);

        return totalSize > 0 ? Number(((sentSize / totalSize) * 100).toFixed(0)) : 0;
    }
}
