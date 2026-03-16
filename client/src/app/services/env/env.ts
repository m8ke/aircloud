import { Injectable } from "@angular/core";
import { environment } from "@/environments/environment";

export interface Environment {
    version: string;
    production: boolean;
    wsUrl: string;
    clientUrl: string;
}

@Injectable({
    providedIn: "root",
})
export class Env {
    public get env(): Environment {
        return environment;
    }

    public get wsUrl(): string {
        return this.env.wsUrl;
    }

    public get clientUrl(): string {
        return this.env.clientUrl;
    }
}
