export class PendingFile {
    public file: File;
    public buffer: Uint8Array[] = [];
    public complete: boolean = false;
    public receivedSize: number = 0;

    public constructor(file: File) {
        this.file = file;
    }
}
