import { v4 as uuidv4 } from "uuid";

export class PeerFile {
    public id: string = uuidv4();
    public file: File;
    public complete: boolean = false;
    public receivedSize: number = 0;
    public buffer: Uint8Array[] = [];

    public constructor(file: File) {
        this.file = file;
    }
}
