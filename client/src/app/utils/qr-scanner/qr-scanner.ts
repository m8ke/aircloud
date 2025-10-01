import jsQR, { QRCode } from "jsqr";
import { inject, Injectable } from "@angular/core";

import { Env } from "@/utils/env/env";
import { P2P } from "@/utils/p2p/p2p";
import { ModalService } from "@/utils/modal/modal";

@Injectable({
    providedIn: "root",
})
export class QrScanner {
    private readonly env: Env = inject<Env>(Env);
    private readonly p2p: P2P = inject<P2P>(P2P);
    private readonly modal: ModalService = inject<ModalService>(ModalService);

    private ctx!: CanvasRenderingContext2D;
    private animationFrameId: number | null = null;

    public async startCamera(video: HTMLVideoElement, canvas: HTMLCanvasElement): Promise<void> {
        try {
            video.srcObject = await navigator.mediaDevices.getUserMedia({
                video: {facingMode: "environment", aspectRatio: 1},
            });

            video.setAttribute("autoplay", "true");
            video.setAttribute("playsinline", "true"); // required for iOS Safari
            video.setAttribute("muted", "true");

            await video.play();

            this.ctx = canvas.getContext("2d")!;
            await this.scanFrame(video, canvas);
        } catch (err) {
            console.error("Error accessing camera:", err);
        }
    }

    public stopCamera(video: HTMLVideoElement): void {
        if (video) {
            const stream: MediaStream | null = video.srcObject as MediaStream | null;

            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }

            video.pause();
            video.srcObject = null;
        }

        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    public async scanFrame(video: HTMLVideoElement, canvas: HTMLCanvasElement): Promise<void> {
        this.animationFrameId = requestAnimationFrame(() => this.scanFrame(video, canvas));

        if (video.readyState !== video.HAVE_ENOUGH_DATA) {
            return;
        }

        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;

        this.ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData: ImageData = this.ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code: QRCode | null = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
            const url: URL = new URL(code.data);

            if (this.animationFrameId && this.isValidRoute(url)) {
                console.log(`[QrScanner] Scanned url ${url} and will be connected`);
                this.p2p.connectPeer(this.parseConnectionId(url.pathname));
                this.modal.close("connectPeer");
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = null;
                this.stopCamera(video);
            }
        }
    }

    private isValidRoute(url: URL): boolean {
        try {
            const isValid: boolean = url.protocol + "//" + url.host === this.env.clientUrl;
            console.log(`[QrScanner] Scanned URL ${url} is valid: ${isValid}. Looking for ${this.env.clientUrl}`);
            return isValid;
        } catch {
            console.log(`[QrScanner] Scanned invalid URL ${url}`);
            return false;
        }
    }

    private parseConnectionId(path: string): string {
        const segments = path.split("/").filter(Boolean);
        return segments[segments.length - 1];
    }
}
