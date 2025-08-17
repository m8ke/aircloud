import { inject, Injectable, PLATFORM_ID, signal } from "@angular/core";
import { isPlatformBrowser } from "@angular/common";

@Injectable({
    providedIn: "root",
})
export class Uploader {
    private readonly _files = signal<File[]>([]);
    private readonly isBrowser = inject(PLATFORM_ID);

    public addFile(file: File): void {
        this.files.push(file);
        console.log("Added file to buffer:", file.name, file.size);
    }

    public addFiles(files: File[]): void {
        for (const file of files) {
            this.files.push(file);
            console.log("Added file to buffer:", file.name, file.size);
        }
    }

    private addFileToSessionStorage(file: File): void {
        // TODO: Store files in session storage
        if (isPlatformBrowser(this.isBrowser)) {
            this.files.push(file);
            sessionStorage.setItem("files", JSON.stringify(this.isBrowser));
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
