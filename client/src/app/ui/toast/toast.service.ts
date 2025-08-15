import { AfterViewInit, Injectable, OnInit } from "@angular/core";
import { BehaviorSubject, Observable } from "rxjs";

export interface IToast {
    id: number;
    message: string;
    type: "success" | "error" | "info";
}

@Injectable({
    providedIn: "root",
})
export class ToastService {
    private counter: number = 0;
    public toasts$ = new BehaviorSubject<IToast[]>([]);

    public show(message: string, type: "success" | "error" | "info" = "success", duration: number = 6000): void {
        const id: number = this.counter++;
        const toast: IToast = {id, message, type};
        this.toasts$.next([...this.toasts$.value, toast]);
        setTimeout(() => this.remove(id), duration);
    }

    public remove(id: number): void {
        this.toasts$.next(this.toasts$.value.filter(t => t.id !== id));
    }
}
