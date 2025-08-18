import { Component, inject, OnInit } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { Toast } from "@/ui/toast/toast";
import { animals, uniqueNamesGenerator } from "unique-names-generator";
import { SessionStorage } from "@/utils/storage/session-storage";
import { LocalStorage } from "@/utils/storage/local-storage";

@Component({
    selector: "app-root",
    imports: [RouterOutlet, Toast],
    templateUrl: "./app.html",
    styleUrl: "./app.scss",
})
export class App implements OnInit {
    private readonly sessionStorage: SessionStorage = inject<LocalStorage>(SessionStorage);

    public ngOnInit(): void {
        if (!this.sessionStorage.getItem("name")) {
            this.sessionStorage.setItem("name", this.generateName());
        }
    }

    private generateName(): string {
        const randomName: string = uniqueNamesGenerator({
            dictionaries: [animals],
        });

        return randomName.charAt(0).toUpperCase() + randomName.slice(1);
    }
}
