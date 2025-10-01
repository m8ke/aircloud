import { v4 as uuidv4 } from "uuid";
import { BlobWriter, ZipWriter } from "@zip.js/zip.js";
import { inject, Injectable, signal } from "@angular/core";

import { Session } from "@/utils/session/session";
import { NotificationService, NotificationType } from "@/ui/notification/notification.service";

@Injectable({
    providedIn: "root",
})
export class FileManager {
    public readonly files = signal<File[]>([]);
    private readonly session: Session = inject<Session>(Session);
    private readonly notification: NotificationService = inject(NotificationService);

    public addFile(file: File): void {
        if (file.size == 0) {
            this.notification.show<any>({
                message: "Could not upload file",
                type: "error",
            }, NotificationType.INFO);
            return;
        }

        const exists: boolean = this.files().some((f: File) =>
            f.name === file.name &&
            f.size === file.size &&
            f.type === file.type &&
            f.lastModified === file.lastModified,
        );

        if (exists) {
            this.notification.show<any>({
                message: `File ${file.name} already exist`,
                type: "error",
            }, NotificationType.INFO);

            return;
        }

        this.files().unshift(file);
        console.log("[FileManager] Added file to buffer:", file.name, file.size);
    }

    public addFiles(files: File[] | FileList): void {
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
