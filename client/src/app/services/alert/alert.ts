import { Title } from "@angular/platform-browser";
import { inject, Injectable } from "@angular/core";

@Injectable({
    providedIn: "root",
})
export class Alert {
    private loaded: boolean = false;
    private readonly title: Title = inject<Title>(Title);
    private readonly audio = new Audio("alert.wav");

    public load(): void {
        if (this.loaded) {
            return;
        }

        this.audio.muted = true;
        this.audio.play()
            .then((): void => {
                this.audio.pause();
                this.audio.muted = true;
                this.audio.currentTime = 0;
                this.loaded = true;
                console.log("Sound loaded");
            })
            .catch(console.error);
    }

    public async play(): Promise<void> {
        if (!this.loaded) {
            console.warn("Sound is not loaded");
            return;
        }

        this.changeFavicon();
        this.changeTitle();
        this.audio.muted = false;
        this.audio.currentTime = 0;
        await this.audio.play();
    }

    private changeTitle(): void {
        this.title.setTitle("Requested file transfer - AirCloud");

        setTimeout((): void => {
            this.title.setTitle("AirCloud - Transfer files cross-platform. Free, secure and peer-to-peer.");
        }, 3000);
    }

    private changeFavicon(): void {
        let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");

        if (!link) {
            link = document.createElement("link");
            link.rel = "icon";
            document.head.appendChild(link);
        }

        link.href = "aircloud-favicon-alert.png";

        setTimeout((): void => {
            link.href = "aircloud-favicon.png";
        }, 6000);
    }
}
