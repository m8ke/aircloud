import { ActivatedRoute } from "@angular/router";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { ChangeDetectionStrategy, Component, ElementRef, inject, OnInit, viewChild } from "@angular/core";

import { Env } from "@/utils/env/env";
import { RTC } from "@/utils/rtc/rtc";
import { Peer } from "@/ui/peer/peer";
import { Modal } from "@/ui/modal/modal";
import { Layout } from "@/ui/layout/layout";
import { Socket } from "@/utils/socket/socket";
import { Session } from "@/utils/session/session";
import { FileManager } from "@/utils/file-manager/file-manager.service";
import { PendingFile } from "@/utils/rtc/pending-file";
import { KeyValuePipe } from "@angular/common";
import { QRCodeComponent } from "angularx-qrcode";

@Component({
    selector: "app-dropzone",
    imports: [
        ReactiveFormsModule,
        Layout,
        Modal,
        Peer,
        KeyValuePipe,
        QRCodeComponent,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: "./dropzone.html",
    styleUrl: "./dropzone.scss",
})
export class Dropzone implements OnInit {
    protected formJoinPeer!: FormGroup;
    protected readonly rtc: RTC = inject<RTC>(RTC);
    protected readonly session: Session = inject<Session>(Session);
    protected readonly fileManager: FileManager = inject<FileManager>(FileManager);

    private readonly env: Env = inject<Env>(Env);
    private readonly route: ActivatedRoute = inject<ActivatedRoute>(ActivatedRoute);
    private readonly socket: Socket = inject<Socket>(Socket);
    private readonly formBuilder: FormBuilder = inject<FormBuilder>(FormBuilder);

    protected readonly addFileElement = viewChild<ElementRef>("addFileRef");
    protected readonly modalRemoveFiles = viewChild<Modal>("modalRemoveFilesRef");
    protected readonly modalConnectWithPeer = viewChild<Modal>("modalConnectWithPeerRef");

    public ngOnInit(): void {
        this.formJoinPeer = this.formBuilder.group({
            connectionId: [null, [
                Validators.required,
                Validators.minLength(6),
                Validators.maxLength(255),
            ]],
        });

        if (this.connectionId) {
            this.socket.connectPeer(this.connectionId);
        }
    }

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

    protected sendFilesToPeer(peerId: string): void {
        this.rtc.requestFileSending(peerId, this.fileManager.files());
    }

    protected cancelFileSending(peerId: string): void {
        this.rtc.removePendingFilesByPeerId(peerId);
    }

    protected isLoading(peerId: string): boolean {
        const files: PendingFile[] | undefined = this.rtc.pendingFiles().get(peerId);

        if (!files || files.length === 0) {
            return false;
        }

        return files.some(file => !file.complete);
    }

    protected getProgress(peerId: string): number {
        const files: PendingFile[] | undefined = this.rtc.pendingFiles().get(peerId);

        if (!files || files.length === 0) {
            return 0;
        }

        const totalSize: number = files.reduce((sum, f) => sum + f.file.size, 0);
        const sentSize: number = files.reduce((sum, f) => sum + f.receivedSize, 0);

        return totalSize > 0 ? Number(((sentSize / totalSize) * 100).toFixed(0)) : 0;
    }

    protected get directConnectionUrl(): string {
        return `${this.env.clientUrl}/pair/${this.session.connectionId}`;
    }

    private get connectionId(): string | null {
        return this.route.snapshot.params["connectionId"];
    }

    protected onConnectPeer(): void {
        this.socket.connectPeer(this.formJoinPeer.get("connectionId")?.value);
    }
}
