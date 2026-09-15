import { DOCUMENT } from "@angular/common";
import { Component, inject, signal, ChangeDetectionStrategy } from "@angular/core";

import { Navbar } from "@/ui/navbar/navbar";
import { CdkDropList } from "@angular/cdk/drag-drop";
import { FileManager } from "@/services/file-manager/file-manager";
import { Notification } from "@/ui/notification/notification";

@Component({
    selector: "app-layout",
    imports: [
        Navbar,
        CdkDropList,
        Notification,
    ],
    templateUrl: "./layout.html",
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: "./layout.scss",
})
export class Layout {
    private readonly document: Document = inject<Document>(DOCUMENT);
    private readonly fileManager: FileManager = inject(FileManager);
    protected readonly isFileDropping = signal<boolean>(false);

    protected onDragOver(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.isFileDropping.set(true);
    }

    protected onFileDrop(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.isFileDropping.set(false);
        const files = event.dataTransfer?.files;

        if (files != undefined) {
            this.fileManager.addFiles(files);
        }
    }

    protected onDragLeave(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.isFileDropping.set(false);
    }

    protected async nativeShare(): Promise<void> {
        if (navigator.share) {
            try {
                await navigator.share({
                title: "AirCloud",
                text: "Share files securely and free!",
                url: this.document.location?.origin ?? "",
                });
            } catch (error) {
                console.warn(error);
            }
        } else {
            console.warn("Sharing not supported on this browser");
        }
    }

    protected get isNativeShareEnabled(): boolean {
        return !!navigator.share;
    }
}
