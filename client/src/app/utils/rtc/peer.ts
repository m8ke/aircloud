export class Peer {
    public name: string;
    public device: string;
    public isSendingFiles: boolean;
    public pc: RTCPeerConnection;

    public constructor(name: string, device: string, pc: RTCPeerConnection, isSendingFiles: boolean = false) {
        this.name = name;
        this.device = device;
        this.pc = pc;
        this.isSendingFiles = isSendingFiles;
    }
}
