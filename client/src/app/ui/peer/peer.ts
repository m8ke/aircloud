import { Component, input } from "@angular/core";
import { NgStyle } from "@angular/common";

@Component({
    selector: "app-peer",
    imports: [
        NgStyle,
    ],
    templateUrl: "./peer.html",
    styleUrl: "./peer.scss",
})
export class Peer {
    public key = input.required<string>();
    public name = input.required<string>();
    public device = input.required<string>();
    public progress = input<number>(0);
    public isLoading = input<boolean>(false);
}
