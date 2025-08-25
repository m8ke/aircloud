import { Routes } from "@angular/router";
import { Dropzone } from "@/pages/dropzone/dropzone";

export const routes: Routes = [
    {
        path: "",
        component: Dropzone,
    },
    {
        path: "**",
        redirectTo: "",
    },
];
