import { Component, input } from "@angular/core";

@Component({
    selector: "app-peer",
    imports: [],
    templateUrl: "./peer.html",
    styleUrl: "./peer.scss",
})
export class Peer {
    public readonly name = input.required();
    public readonly device = input.required();
}
