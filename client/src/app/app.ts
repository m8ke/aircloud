import { Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { Toast } from "@/ui/toast/toast";

@Component({
    selector: "app-root",
    imports: [RouterOutlet, Toast],
    templateUrl: "./app.html",
    styleUrl: "./app.scss",
})
export class App {
}
