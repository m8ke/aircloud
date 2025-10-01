import {
    ChangeDetectionStrategy, Component, ElementRef, inject, OnDestroy, OnInit, viewChild,
} from "@angular/core";

import { RouterLink } from "@angular/router";
import { QRCodeComponent } from "angularx-qrcode";
import { NgOptimizedImage } from "@angular/common";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";

import { Env } from "@/utils/env/env";
import { P2P } from "@/utils/p2p/p2p";
import { Modal } from "@/ui/modal/modal";
import { Session } from "@/utils/session/session";
import { QrScanner } from "@/utils/qr-scanner/qr-scanner";
import { ModalService } from "@/utils/modal/modal";
import { CopyClipboard } from "@/utils/copy-clipboard/copy-clipboard";

@Component({
    selector: "app-navbar",
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        RouterLink,
        NgOptimizedImage,
        ReactiveFormsModule,
        Modal,
        QRCodeComponent,
        CopyClipboard,
    ],
    templateUrl: "./navbar.html",
    styleUrl: "./navbar.scss",
})
export class Navbar implements OnInit, OnDestroy {
    private _state: string = "qr";
    protected formJoinPeer!: FormGroup;

    private readonly env: Env = inject<Env>(Env);
    private readonly qrScanner: QrScanner = inject<QrScanner>(QrScanner);
    private readonly formBuilder: FormBuilder = inject<FormBuilder>(FormBuilder);

    protected readonly p2p: P2P = inject<P2P>(P2P);
    protected readonly modal: ModalService = inject<ModalService>(ModalService);
    protected readonly session: Session = inject<Session>(Session);

    protected readonly video = viewChild<ElementRef<HTMLVideoElement>>("videoRef");
    protected readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>("canvasRef");

    public async ngOnInit(): Promise<void> {
        this.formJoinPeer = this.formBuilder.group({
            connectionId: [null, [
                Validators.required,
                Validators.minLength(6),
                Validators.maxLength(255),
            ]],
        });
    }

    public ngOnDestroy(): void {
        const video: HTMLVideoElement | undefined = this.video()?.nativeElement;

        if (video) {
            this.qrScanner.stopCamera(video);
        }
    }

    protected onConnectPeer(): void {
        this.p2p.connectPeer(this.formJoinPeer.get("connectionId")?.value);
    }

    protected async openCamera(): Promise<void> {
        this.state = "camera";
        const video: HTMLVideoElement | undefined = this.video()?.nativeElement;
        const canvas: HTMLCanvasElement | undefined = this.canvas()?.nativeElement;

        if (video && canvas) {
            await this.qrScanner.startCamera(video, canvas);
        }
    }

    protected closeCamera(): void {
        this.state = "qr";
        const video: HTMLVideoElement | undefined = this.video()?.nativeElement;

        if (video) {
            this.qrScanner.stopCamera(video);
        }
    }

    protected openConnectPeerModal(): void {
        this.state = "qr";
        this.modal.open("connectPeer");
    }

    protected get directConnectionUrl(): string {
        return `${this.env.clientUrl}/pair/${this.session.connectionId}`;
    }

    protected get state(): string {
        return this._state;
    }

    protected set state(state: string) {
        const video: HTMLVideoElement | undefined = this.video()?.nativeElement;

        if (video) {
            video.hidden = state != "camera";
        }

        this._state = state;
    }
}
