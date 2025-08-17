import { Component, inject } from "@angular/core";
import { RouterLink } from "@angular/router";
import { NgOptimizedImage } from "@angular/common";
import { RTC } from "@/utils/rtc/rtc";

@Component({
    selector: "app-navbar",
    imports: [
        RouterLink,
        NgOptimizedImage,
    ],
    templateUrl: "./navbar.html",
    styleUrl: "./navbar.scss",
})
export class Navbar {
    protected readonly rtc = inject(RTC);
}
