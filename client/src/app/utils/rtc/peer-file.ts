import { UUID } from "node:crypto";

export class PeerFile {
    public id: UUID = crypto.randomUUID();
    public file: File;
    public complete: boolean = false;
    public receivedSize: number = 0;
    public buffer: Uint8Array[] = [];

    public constructor(file: File) {
        this.file = file;
    }
}
