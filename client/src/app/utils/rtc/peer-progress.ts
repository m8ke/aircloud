export class PeerProgress {
    public totalSize: number;
    public sentSize: number;

    public constructor(totalSize: number = 0, sentSize: number = 0) {
        this.totalSize = totalSize;
        this.sentSize = sentSize;
    }
}
