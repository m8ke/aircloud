import { v4 as uuidv4 } from "uuid";
import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, Subject } from "rxjs";

export enum NotificationType {
    INFO = "INFO",
    FILE_REQUEST = "FILE_REQUEST",
}

export interface INotification<T = any> {
    id: string;
    type: NotificationType;
    data: T;
    duration: number;
    subject: Subject<NotificationResult>;
}

export enum NotificationResult {
    ACCEPT,
    REJECT
}

@Injectable({
    providedIn: "root",
})
export class NotificationService {
    public notifications$ = new BehaviorSubject<INotification[]>([]);

    public show<T>(data: T, type: NotificationType = NotificationType.INFO, duration: number = 6000): Observable<NotificationResult> {
        const id: string = uuidv4();
        const subject: Subject<NotificationResult> = new Subject<NotificationResult>();
        const notification: INotification = {id, data, subject, type, duration};
        this.notifications$.next([...this.notifications$.value, notification]);

        if (type == NotificationType.INFO) {
            setTimeout(() => this.reject(id), duration);
        }

        return subject.asObservable();
    }

    private resolve(id: string, result: NotificationResult): void {
        const current = this.notifications$.value;
        const index = current.findIndex(n => n.id === id);

        if (index > -1) {
            const [notification] = current.splice(index, 1);
            this.notifications$.next([...current]);
            notification.subject.next(result);
            notification.subject.complete();
        }
    }

    public accept(id: string): void {
        this.resolve(id, NotificationResult.ACCEPT);
    }

    public reject(id: string): void {
        this.resolve(id, NotificationResult.REJECT);
    }
}
