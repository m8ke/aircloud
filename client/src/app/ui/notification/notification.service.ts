import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, Subject } from "rxjs";
import { UUID } from "node:crypto";

export enum NotificationType {
    INFO = "INFO",
    FILE_REQUEST = "FILE_REQUEST",
}

export interface INotification<T = any> {
    id: UUID;
    type: NotificationType;
    data: T;
    duration: number;
    subject: Subject<"accept" | "reject">;
}

@Injectable({
    providedIn: "root",
})
export class NotificationService {
    public notifications$ = new BehaviorSubject<INotification[]>([]);

    public show<T>(data: T, type: NotificationType = NotificationType.INFO, duration: number = 6000): Observable<any> {
        const id: UUID = crypto.randomUUID();
        const subject: Subject<"accept" | "reject"> = new Subject<"accept" | "reject">();
        const notification: INotification = {id, data, subject, type, duration};
        this.notifications$.next([...this.notifications$.value, notification]);

        if (type == NotificationType.INFO) {
            setTimeout(() => this.reject(id), duration);
        }

        return subject.asObservable();
    }

    private resolve(id: UUID, result: "accept" | "reject"): void {
        const current = this.notifications$.value;
        const index = current.findIndex(n => n.id === id);

        if (index > -1) {
            const [notification] = current.splice(index, 1);
            this.notifications$.next([...current]);

            // Emit and complete
            notification.subject.next(result);
            notification.subject.complete();
        }
    }

    public accept(id: UUID): void {
        this.resolve(id, "accept");
    }

    public reject(id: UUID): void {
        this.resolve(id, "reject");
    }
}
