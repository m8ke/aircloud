import { Component, inject, input, output, ChangeDetectionStrategy } from "@angular/core";
import { ModalService } from "@/services/modal/modal";

@Component({
    selector: "app-modal",
    imports: [],
    templateUrl: "./modal.html",
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: "./modal.scss",
})
export class Modal {
    public modalId = input.required<string>();
    public onClose = output<void>();
    private readonly modal = inject(ModalService);

    protected readonly isOpen = () => this.modal.isOpen(this.modalId())();

    public close(): void {
        this.modal.close(this.modalId());
        this.onClose.emit();
    }

    protected get data() {
        return this.modal.getData(this.modalId());
    }
}
