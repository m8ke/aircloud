import { Injectable } from "@angular/core";

@Injectable({
    providedIn: "root",
})
export class Uploader {
    private readonly files: File[] = [];

    public uploadFile(file: File): void {

    }
}
