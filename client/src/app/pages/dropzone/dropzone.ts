import { ReactiveFormsModule } from "@angular/forms";
import { ChangeDetectionStrategy, Component, ElementRef, inject, viewChild } from "@angular/core";

import { P2P } from "@/utils/p2p/p2p";
import { Peer } from "@/ui/peer/peer";
import { Modal } from "@/ui/modal/modal";
import { Layout } from "@/ui/layout/layout";
import { Session } from "@/utils/session/session";
import { FileManager } from "@/utils/file-manager/file-manager";
import { SendingFile } from "@/utils/file-manager/sending-file";
import { ModalService } from "@/utils/modal/modal";
import { KeyValuePipe, NgStyle, TitleCasePipe } from "@angular/common";

@Component({
    selector: "app-dropzone",
    imports: [
        ReactiveFormsModule,
        Layout,
        Modal,
        Peer,
        KeyValuePipe,
        TitleCasePipe,
        NgStyle,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: "./dropzone.html",
    styleUrl: "./dropzone.scss",
})
export class Dropzone {
    protected readonly p2p: P2P = inject<P2P>(P2P);
    protected readonly modal: ModalService = inject<ModalService>(ModalService);
    protected readonly session: Session = inject<Session>(Session);
    protected readonly fileManager: FileManager = inject<FileManager>(FileManager);

    protected readonly addFileElement = viewChild<ElementRef>("addFileRef");

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
        this.p2p.requestFileSending(peerId, await this.fileManager.bundleFiles());
    }

    protected cancelFileSending(peerId: string): void {
        this.p2p.removePendingFilesByPeerId(peerId);
    }

    protected isLoading(peerId: string): boolean {
        return !!this.p2p.sendingFiles().get(peerId);
    }

    protected getProgress(peerId: string): number {
        const file: SendingFile | undefined = this.p2p.sendingFiles().get(peerId);

        if (!file) {
            return 0;
        }

        return file.file.size > 0 ? Number(((file.receivedSize / file.file.size) * 100).toFixed(0)) : 0;
    }

    protected clearAll(): void {
        this.onRemoveFiles();
        this.modal.close("connectPeer");
    }
}
