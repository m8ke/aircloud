import { TitleCasePipe } from "@angular/common";
import { Component, input, output, ChangeDetectionStrategy } from "@angular/core";

@Component({
    selector: "app-notification-file-request",
    imports: [
        TitleCasePipe,
    ],
    templateUrl: "./notification-file-request.html",
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: "./notification-file-request.scss",
})
export class NotificationFileRequest {
    public readonly data = input.required<{ metadata: any; name: string }>();
    public readonly close = output<void>();
    public readonly accept = output<void>();
}
