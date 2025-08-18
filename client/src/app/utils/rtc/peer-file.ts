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

export class PeerProgress {
    public totalSize: number;
    public sentSize: number;

    public constructor(totalSize: number = 0, sentSize: number = 0) {
        this.totalSize = totalSize;
        this.sentSize = sentSize;
    }
}
