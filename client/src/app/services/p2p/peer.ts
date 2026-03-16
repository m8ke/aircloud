export class Peer {
    public pc: RTCPeerConnection;
    public name: string;
    public device: string;
    public candidates: RTCIceCandidateInit[] = [];
    public isSendingFiles: boolean = false;

    public constructor(
        pc: RTCPeerConnection,
        name: string,
        device: string,
        isSendingFiles: boolean = false,
    ) {
        this.pc = pc;
        this.name = name;
        this.device = device;
        this.isSendingFiles = isSendingFiles;
    }
}
