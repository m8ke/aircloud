import { Injectable, signal } from "@angular/core";

@Injectable({
    providedIn: "root",
})
export class FileManager {
    public readonly files = signal<File[]>([]);

    public addFile(file: File): void {
        this.files().unshift(file);
        console.log("[FileManager] Added file to buffer:", file.name, file.size);
    }

    public addFiles(files: File[]): void {
        for (const file of files) {
            this.addFile(file);
        }
    }

    public removeFiles(): void {
        this.files.set([]);
        console.log("Cleared all files in buffer");
    }

    public removeFile(index: number): void {
        this.files.update((files: File[]) => files.filter((_: File, i: number): boolean => i !== index));
    }
}
