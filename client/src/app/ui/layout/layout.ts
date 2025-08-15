import { Component, signal } from "@angular/core";
import { Navbar } from "@/ui/navbar/navbar";
import { CdkDropList } from "@angular/cdk/drag-drop";

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
            const file = event.dataTransfer.files[0];
            this.uploadFile(file);
        }
    }

    protected onDragLeave(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.isFileDropping.set(false);
    }

    private uploadFile(file: File): void {
        console.log("Uploading:", file.name, file.size);
    }
}
