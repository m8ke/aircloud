import { Component, EventEmitter, Output, signal, Signal } from "@angular/core";

@Component({
    selector: "app-modal",
    imports: [],
    templateUrl: "./modal.html",
    styleUrl: "./modal.scss",
})
export class Modal {
    private _isOpen = signal<boolean>(false);
    @Output() public onSubmit = new EventEmitter<unknown>();
    @Output() public onCancel = new EventEmitter<unknown>();

    public get state(): Signal<boolean> {
        return this._isOpen.asReadonly();
    }

    public open(): void {
        this._isOpen.set(true);
    }

    public close(): void {
        this.onCancel.emit();
        this._isOpen.set(false);
    }

    public continue(): void {
        this.onSubmit.emit();
        this.close();
    }
}
