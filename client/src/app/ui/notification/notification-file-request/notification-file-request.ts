import { Component, EventEmitter, input, Output } from "@angular/core";

@Component({
    selector: "app-notification-file-request",
    imports: [],
    templateUrl: "./notification-file-request.html",
    styleUrl: "./notification-file-request.scss",
})
export class NotificationFileRequest {
    public data = input.required<{ metadata: any; name: string }>();

    @Output() close = new EventEmitter<void>();
    @Output() accept = new EventEmitter<void>();
}
