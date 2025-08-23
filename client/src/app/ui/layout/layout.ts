import { Component, inject, signal } from "@angular/core";
import { Navbar } from "@/ui/navbar/navbar";
import { CdkDropList } from "@angular/cdk/drag-drop";
import { FileManager } from "@/utils/file-manager/file-manager.service";
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
    private readonly notification = inject(NotificationService);
    private readonly uploader = inject(FileManager);
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

        if (event.dataTransfer?.files.length) {
            for (const file of event.dataTransfer.files) {
                // TODO: Check replicates
                if (this.uploader.files().includes(file)) {
                    this.notification.show<any>({
                        message: `File ${file.name} already exist`,
                        type: "error",
                    }, NotificationType.INFO);
                    continue;
                }
                this.uploader.addFile(file);
            }
        } else {
            this.notification.show<any>({
                message: "Could not upload file",
                type: "error",
            }, NotificationType.INFO);
        }
    }

    protected onDragLeave(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.isFileDropping.set(false);
    }
}
