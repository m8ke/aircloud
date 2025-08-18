export interface PeerFileMetadata {
    name: string;
    size: number,
    type: string
}

export class PeerFile {
    public metadata: PeerFileMetadata;
    public buffer: Uint8Array[] = [];
    public receivedSize: number = 0;
    public complete: boolean = false;

    public constructor(metadata: PeerFileMetadata) {
        this.metadata = metadata;
    }
}
