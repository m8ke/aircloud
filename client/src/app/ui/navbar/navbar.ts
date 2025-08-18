import { Component, inject, OnInit, viewChild } from "@angular/core";
import { RouterLink } from "@angular/router";
import { NgOptimizedImage } from "@angular/common";
import { Modal } from "@/ui/modal/modal";
import { Dropdown } from "@/ui/dropdown/dropdown";
import { DropdownItem } from "@/ui/dropdown-item/dropdown-item";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";

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
    private readonly formBuilder = inject<FormBuilder>(FormBuilder);
    protected readonly modalChangeSettings = viewChild<Modal>("modalChangeSettingsRef");

    public ngOnInit(): void {
        this.form = this.formBuilder.group({
            name: [null, Validators.required],
            discoverable: ["network", Validators.required],
            saveToBrowser: [true, Validators.required],
        });
    }

    protected saveSettings(): void {
        // TODO
    }
}
