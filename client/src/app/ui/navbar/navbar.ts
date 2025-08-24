import { Component, computed, inject, OnInit } from "@angular/core";
import { RouterLink } from "@angular/router";
import { NgOptimizedImage, NgStyle } from "@angular/common";
import { Modal } from "@/ui/modal/modal";
import { Dropdown } from "@/ui/dropdown/dropdown";
import { DropdownItem } from "@/ui/dropdown-item/dropdown-item";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { RTC } from "@/utils/rtc/rtc";
import { Session } from "@/utils/session/session";

@Component({
    selector: "app-navbar",
    imports: [
        RouterLink,
        NgOptimizedImage,
        Modal,
        Dropdown,
        DropdownItem,
        ReactiveFormsModule,
        NgStyle,
    ],
    templateUrl: "./navbar.html",
    styleUrl: "./navbar.scss",
})
export class Navbar implements OnInit {
    protected form!: FormGroup;
    protected readonly rtc: RTC = inject<RTC>(RTC);
    protected readonly session: Session = inject<Session>(Session);
    private readonly formBuilder: FormBuilder = inject<FormBuilder>(FormBuilder);

    // protected readonly modalChangeSettings = viewChild<Modal>("modalChangeSettingsRef");

    public ngOnInit(): void {
        this.form = this.formBuilder.group({
            name: [null, Validators.required],
            discoverable: ["network", Validators.required],
            saveToBrowser: [false, Validators.required],
        });
    }

    protected saveSettings(): void {
        throw new Error("Method not implemented");
    }

    protected isReceiving(): boolean {
        return this.rtc.receivingFiles().size > 0;
    }

    protected readonly progress = computed(() => {
        let totalSize: number = 0;
        let receivedSize: number = 0;

        for (const files of this.rtc.receivingFiles().values()) {
            for (const file of files) {
                totalSize += file.metadata.size;
                receivedSize += file.receivedSize;
            }
        }

        return totalSize > 0
            ? Math.round((receivedSize / totalSize) * 100)
            : 0;
    });
}
