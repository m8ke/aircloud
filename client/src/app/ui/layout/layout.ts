import { NgStyle, TitleCasePipe } from "@angular/common";
import { Component, inject, signal } from "@angular/core";

import { RTC } from "@/utils/rtc/rtc";
import { Navbar } from "@/ui/navbar/navbar";
import { Session } from "@/utils/session/session";
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
        TitleCasePipe,
        NgStyle,
    ],
    templateUrl: "./layout.html",
    styleUrl: "./layout.scss",
})
export class Layout {
    protected readonly rtc: RTC = inject<RTC>(RTC);
    protected readonly session: Session = inject<Session>(Session);
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

        if (event.dataTransfer?.files.length) {
            for (const file of event.dataTransfer.files) {
                // TODO: Check replicates
                if (this.fileManager.files().includes(file)) {
                    this.notification.show<any>({
                        message: `File ${file.name} already exist`,
                        type: "error",
                    }, NotificationType.INFO);
                    continue;
                }
                this.fileManager.addFile(file);
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
