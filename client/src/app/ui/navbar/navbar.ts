import { Component, inject, OnInit, viewChild } from "@angular/core";
import { RouterLink } from "@angular/router";
import { NgOptimizedImage } from "@angular/common";
import { Modal } from "@/ui/modal/modal";
import { Dropdown } from "@/ui/dropdown/dropdown";
import { DropdownItem } from "@/ui/dropdown-item/dropdown-item";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { LocalStorage } from "@/utils/storage/local-storage";
import { SessionStorage } from "@/utils/storage/session-storage";

@Component({
    selector: "app-navbar",
    imports: [
        RouterLink,
        NgOptimizedImage,
        Modal,
        Dropdown,
        DropdownItem,
        ReactiveFormsModule,
    ],
    templateUrl: "./navbar.html",
    styleUrl: "./navbar.scss",
})
export class Navbar implements OnInit {
    protected form!: FormGroup;
    private readonly formBuilder: FormBuilder = inject<FormBuilder>(FormBuilder);
    private readonly localStorage: LocalStorage = inject<LocalStorage>(LocalStorage);
    private readonly sessionStorage: SessionStorage = inject<LocalStorage>(SessionStorage);
    protected readonly modalChangeSettings = viewChild<Modal>("modalChangeSettingsRef");

    public ngOnInit(): void {
        this.form = this.formBuilder.group({
            name: [null, Validators.required],
            discoverable: ["network", Validators.required],
            saveToBrowser: [false, Validators.required],
        });
    }

    protected saveSettings(): void {
        if (Boolean(this.form.get("saveToBrowser")?.value)) {
            this.localStorage.setItem("name", this.form.get("name")?.value);
        } else {
            this.sessionStorage.setItem("name", this.form.get("name")?.value);
        }
    }

    public get name(): string {
        return this.sessionStorage.getItem("name") || "-";
    }
}
