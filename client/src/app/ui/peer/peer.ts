import { Component, Input, input } from "@angular/core";

@Component({
    selector: "app-peer",
    imports: [],
    templateUrl: "./peer.html",
    styleUrl: "./peer.scss",
})
export class Peer {
    public key = input.required();
    public name = input.required();
    public device = input.required();
}
