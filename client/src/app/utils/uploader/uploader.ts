import { Injectable, signal } from "@angular/core";

@Injectable({
    providedIn: "root",
})
export class Uploader {
    private readonly _files = signal<File[]>([]);

    public uploadFile(file: File): void {
        this.files.push(file);
        console.log("Added file to buffer:", file.name, file.size);
    }

    public uploadFiles(files: File[]): void {
        for (const file of files) {
            this.files.push(file);
            console.log("Added file to buffer:", file.name, file.size);
        }
    }

    public get files(): File[] {
        return this._files();
    }

    public removeFiles(): void {
        this._files.set([]);
        console.log("Cleared all files in buffer");
    }

    public removeFile(index: number): void {
        this._files.update(arr => arr.filter((_, i) => i !== index));
    }
}
