import { bootstrapApplication } from "@angular/platform-browser";
import { App } from "@/app";
import { config } from "@/app.config.server";

const bootstrap = () => bootstrapApplication(App, config);

export default bootstrap;
