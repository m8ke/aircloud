import { ActivatedRoute } from "@angular/router";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { ChangeDetectionStrategy, Component, ElementRef, inject, OnInit, viewChild } from "@angular/core";

import { Env } from "@/utils/env/env";
import { P2P } from "@/utils/p2p/p2p";
import { Peer } from "@/ui/peer/peer";
import { Modal } from "@/ui/modal/modal";
import { Layout } from "@/ui/layout/layout";
import { Session } from "@/utils/session/session";
import { FileManager } from "@/utils/file-manager/file-manager";
import { SendingFile } from "@/utils/file-manager/sending-file";
import { KeyValuePipe, NgStyle, TitleCasePipe } from "@angular/common";
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
        TitleCasePipe,
        NgStyle,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: "./dropzone.html",
    styleUrl: "./dropzone.scss",
})
export class Dropzone implements OnInit {
    protected formJoinPeer!: FormGroup;
    protected readonly p2p: P2P = inject<P2P>(P2P);
    protected readonly session: Session = inject<Session>(Session);
    protected readonly fileManager: FileManager = inject<FileManager>(FileManager);

    private readonly env: Env = inject<Env>(Env);
    private readonly route: ActivatedRoute = inject<ActivatedRoute>(ActivatedRoute);
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
            this.p2p.connectPeer(this.connectionId);
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

    protected get directConnectionUrl(): string {
        return `${this.env.clientUrl}/pair/${this.session.connectionId}`;
    }

    private get connectionId(): string | null {
        return this.route.snapshot.params["connectionId"];
    }

    protected onConnectPeer(): void {
        this.p2p.connectPeer(this.formJoinPeer.get("connectionId")?.value);
    }
}
