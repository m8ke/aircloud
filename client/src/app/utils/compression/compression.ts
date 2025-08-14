import { Injectable } from "@angular/core";
import { deflate, inflate } from "pako";

@Injectable({
    providedIn: "root",
})
export class Compression {
    public compress(data: string): string {
        const utf8: Uint8Array<ArrayBufferLike> = new TextEncoder().encode(data);
        const compressed: Uint8Array<ArrayBufferLike> = deflate(utf8);
        return btoa(String.fromCharCode(...compressed));
    }

    public decompress(base64: string): string {
        const binary: Uint8Array<ArrayBufferLike> = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        const decompressed: Uint8Array<ArrayBufferLike> = inflate(binary);
        return new TextDecoder().decode(decompressed);
    }
}
