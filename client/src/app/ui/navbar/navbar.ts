import { Component } from "@angular/core";
import { RouterLink } from "@angular/router";
import { NgOptimizedImage } from "@angular/common";
import { ReactiveFormsModule } from "@angular/forms";

@Component({
    selector: "app-navbar",
    imports: [
        RouterLink,
        NgOptimizedImage,
        ReactiveFormsModule,
    ],
    templateUrl: "./navbar.html",
    styleUrl: "./navbar.scss",
})
export class Navbar {
}
