import { Component, input, output } from "@angular/core";

@Component({
    selector: "app-notification-info",
    imports: [],
    templateUrl: "./notification-info.html",
    styleUrl: "./notification-info.scss",
})
export class NotificationInfo {
    public data = input.required<{ message: string, type: "success" | "error" }>();
    public close = output<any>();

    closeNotification() {
        this.close.emit(true);
    }
}
