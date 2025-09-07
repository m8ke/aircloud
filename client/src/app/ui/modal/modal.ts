import { Component, EventEmitter, input, Output, signal, Signal } from "@angular/core";

@Component({
    selector: "app-modal",
    imports: [],
    templateUrl: "./modal.html",
    styleUrl: "./modal.scss",
})
export class Modal {
    public disabled = input<boolean>(false);
    public isWarning = input<boolean>(false);

    private readonly isOpen = signal<boolean>(false);

    // TODO: Use output()
    @Output() public onSubmit = new EventEmitter<unknown>();
    @Output() public onClose = new EventEmitter<unknown>();

    protected get state(): Signal<boolean> {
        return this.isOpen.asReadonly();
    }

    public open(): void {
        this.isOpen.set(true);
    }

    protected close(): void {
        this.onClose.emit();
        this.isOpen.set(false);
    }

    protected continue(): void {
        this.onSubmit.emit();
        this.close();
    }
}
