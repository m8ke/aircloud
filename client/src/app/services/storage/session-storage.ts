import { Injectable } from "@angular/core";

@Injectable({
    providedIn: "root",
})
export class SessionStorage {
    public setItem(key: string, value: any): void {
        try {
            const jsonValue = JSON.stringify(value);
            sessionStorage.setItem(key, jsonValue);
        } catch (error) {
            console.error("Error saving to local storage", error);
        }
    }

    public getItem<T>(key: string): T | null {
        try {
            const value = sessionStorage.getItem(key);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            console.error("Error reading from local storage", error);
            return null;
        }
    }

    public removeItem(key: string): void {
        sessionStorage.removeItem(key);
    }

    public clear(): void {
        sessionStorage.clear();
    }
}
