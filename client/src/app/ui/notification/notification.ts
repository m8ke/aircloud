import { Component, inject } from "@angular/core";
import { Observable } from "rxjs";
import { INotification, NotificationType , NotificationService } from "@/ui/notification/notification.service";
import { AsyncPipe } from "@angular/common";
import { NotificationFileRequest } from "@/ui/notification/notification-file-request/notification-file-request";
import { NotificationInfo } from "@/ui/notification/notification-info/notification-info";
import { UUID } from "node:crypto";

@Component({
    selector: "app-notification",
    imports: [
        AsyncPipe,
        NotificationFileRequest,
        NotificationInfo,
    ],
    templateUrl: "./notification.html",
    styleUrl: "./notification.scss",
})
export class Notification {
    protected readonly NotificationType = NotificationType;
    private readonly notification: NotificationService = inject(NotificationService);

    protected get notification$(): Observable<INotification[]> {
        return this.notification.notifications$.asObservable();
    }

    protected onAccept(id: UUID): void {
        this.notification.accept(id);
    }

    protected onReject(id: UUID): void {
        this.notification.reject(id);
    }
}
