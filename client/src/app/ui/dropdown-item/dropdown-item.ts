import { AfterViewInit, Component, ElementRef, input, Optional } from "@angular/core";
import { Dropdown } from "@/ui/dropdown/dropdown";

@Component({
    selector: "app-dropdown-item",
    imports: [],
    templateUrl: "./dropdown-item.html",
    styleUrl: "./dropdown-item.scss",
})
export class DropdownItem implements AfterViewInit {
    public label!: string;
    public value = input.required<string | number | boolean>();
    public isSelected = input<boolean>(false);

    public constructor(
        @Optional() private readonly parentComponent: Dropdown,
        private readonly elementRef: ElementRef,
    ) {
    }

    public ngAfterViewInit(): void {
        this.label = this.elementRef.nativeElement.innerText.trim();

        if (this.isSelected()) {
            this.parentComponent.selectValue(this.value());
        }
    }

    public select(): void {
        if (this.parentComponent) {
            this.parentComponent.select(this.value());
        }
    }
}
