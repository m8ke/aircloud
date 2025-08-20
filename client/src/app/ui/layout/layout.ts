import { Component, inject, signal } from "@angular/core";
import { Navbar } from "@/ui/navbar/navbar";
import { CdkDropList } from "@angular/cdk/drag-drop";
import { Uploader } from "@/utils/uploader/uploader";
import { ToastService } from "@/ui/toast/toast.service";

@Component({
    selector: "app-layout",
    imports: [
        Navbar,
        CdkDropList,
    ],
    templateUrl: "./layout.html",
    styleUrl: "./layout.scss",
})
export class Layout {
    private readonly toast = inject(ToastService);
    private readonly uploader = inject(Uploader);
    protected readonly isFileDropping = signal<boolean>(false);

    protected onDragOver(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.isFileDropping.set(true);
    }

    protected onFileDrop(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.isFileDropping.set(false);

        if (event.dataTransfer?.files.length) {
            for (const file of event.dataTransfer.files) {
                // TODO: Check replicates
                if (this.uploader.files().includes(file)) {
                    this.toast.show(`File ${file.name} already exist`, "error");
                    continue;
                }
                this.uploader.addFile(file);
            }
        } else {
            this.toast.show("Could not upload file", "error");
        }
    }

    protected onDragLeave(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.isFileDropping.set(false);
    }
}
