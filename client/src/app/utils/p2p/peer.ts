export class Peer {
    public pc: RTCPeerConnection;
    public name: string;
    public device: string;
    public isSendingFiles: boolean;
    public candidates: RTCIceCandidateInit[] = [];

    public constructor(
        name: string,
        device: string,
        pc: RTCPeerConnection,
        isSendingFiles: boolean = false,
    ) {
        this.pc = pc;
        this.name = name;
        this.device = device;
        this.isSendingFiles = isSendingFiles;
    }
}
