import { Component, ContentChildren, forwardRef, HostListener, input, QueryList } from "@angular/core";
import { NG_VALUE_ACCESSOR } from "@angular/forms";
import { DropdownItem } from "@/ui/dropdown-item/dropdown-item";
import { TitleCasePipe } from "@angular/common";

@Component({
    selector: "app-dropdown",
    imports: [
        TitleCasePipe,
    ],
    templateUrl: "./dropdown.html",
    styleUrl: "./dropdown.scss",
    providers: [{
        provide: NG_VALUE_ACCESSOR,
        useExisting: forwardRef(() => Dropdown),
        multi: true,
    }],
})
export class Dropdown {
    public label = input<string>();
    public placeholder = input<string>("Select...");
    @ContentChildren(forwardRef(() => DropdownItem))
    public items!: QueryList<DropdownItem>;
    public isOpen: boolean = false;
    public selectedValue!: string | undefined;

    private onChange = (_: any) => null;
    private onTouched = () => null;

    public writeValue(value: string): void {
        this.selectedValue = value;
    }

    public registerOnChange(fn: any): void {
        this.onChange = fn;
    }

    public registerOnTouched(fn: any): void {
        this.onTouched = fn;
    }

    public select(value: string | number | boolean | null): void {
        this.selectValue(value);
        this.onTouched();
        this.toggleDropdown();
    }

    public selectValue(value: string | number | boolean | null): void {
        this.selectedValue = this.items.find((item) => item.value() === value)?.label;
        this.onChange(value);
    }

    public toggleDropdown() {
        this.isOpen = !this.isOpen;
    }

    @HostListener("document:click", ["$event"])
    public closeOutside(event: MouseEvent) {
        const target = event.target as HTMLElement;
        if (!target.closest(".dropdown-wrapper")) {
            this.isOpen = false;
        }
    }
}
