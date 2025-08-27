import { v4 as uuidv4 } from "uuid";
import { inject, Injectable, signal } from "@angular/core";
import { BlobWriter, ZipWriter } from "@zip.js/zip.js";
import { Session } from "@/utils/session/session";

@Injectable({
    providedIn: "root",
})
export class FileManager {
    public readonly files = signal<File[]>([]);
    private readonly session: Session = inject<Session>(Session);

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
        console.log("[FileManager] Cleared all files in buffer");
    }

    public removeFile(index: number): void {
        this.files.update((files: File[]) => files.filter((_: File, i: number): boolean => i !== index));
    }

    public async bundleFiles(): Promise<File> {
        if (this.files().length > 1) {
            return await this.bundleZip(this.files());
        } else {
            return this.files()[0];
        }
    }

    private async bundleZip(files: File[]): Promise<File> {
        const zipWriter = new ZipWriter(new BlobWriter("application/zip"));

        for (const file of files) {
            await zipWriter.add(file.name, file.stream());
        }

        const zipBlob: Blob = await zipWriter.close();
        return new File([zipBlob], `${this.zipName}.zip`, {type: "application/zip"});
    }

    private get zipName(): string {
        return `${this.session.name}-${uuidv4()}`;
    }

}
