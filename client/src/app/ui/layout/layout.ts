import { Component, inject, signal } from "@angular/core";

import { Navbar } from "@/ui/navbar/navbar";
import { CdkDropList } from "@angular/cdk/drag-drop";
import { FileManager } from "@/utils/file-manager/file-manager";
import { Notification } from "@/ui/notification/notification";
import { NotificationService, NotificationType } from "@/ui/notification/notification.service";

@Component({
    selector: "app-layout",
    imports: [
        Navbar,
        CdkDropList,
        Notification,
    ],
    templateUrl: "./layout.html",
    styleUrl: "./layout.scss",
})
export class Layout {
    private readonly fileManager: FileManager = inject(FileManager);
    private readonly notification: NotificationService = inject(NotificationService);
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
}
