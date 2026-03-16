import { RTCType } from "@/utils/p2p/rtc-type";

export interface RtcPayload {
    type: RTCType;
}

export interface RtcRequestedFileShare extends RtcPayload {
    name: string;
    metadata: {
        name: string;
        size: number;
        type: string;
    },
}

export interface RtcPeerDataChanges extends RtcPayload {
    name: string;
}
