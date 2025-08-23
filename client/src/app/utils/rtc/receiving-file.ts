export interface PeerFileMetadata {
    name: string;
    size: number;
    type: string;
}

export class ReceivingFile {
    public metadata: PeerFileMetadata;
    public buffer: Uint8Array[] = [];
    public complete: boolean = false;
    public receivedSize: number = 0;

    public constructor(metadata: PeerFileMetadata) {
        this.metadata = metadata;
    }
}
