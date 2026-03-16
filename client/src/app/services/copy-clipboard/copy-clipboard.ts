import { Clipboard } from "@angular/cdk/clipboard";
import { Directive, ElementRef, inject, input, signal } from "@angular/core";

@Directive({
    selector: "[copyClipboard]",
    standalone: true,
    host: {
        "(click)": "copy()",
        "[class.text-indigo-500]": "isCopied()",
    },
})
export class CopyClipboard {
    private readonly element: ElementRef = inject<ElementRef>(ElementRef);
    private readonly clipboard: Clipboard = inject<Clipboard>(Clipboard);

    public duration = input(5000);
    public copiedText = input("Copied!");
    public copyClipboard = input.required<string | null>();

    protected isCopied = signal(false);
    private originalText!: string;
    private resetTimer!: NodeJS.Timeout | null;

    public copy(): void {
        const value: string | null = this.copyClipboard();

        if (!value) {
            return;
        }

        this.clipboard.copy(value);
        this.originalText ||= this.element.nativeElement.textContent ?? "";
        this.element.nativeElement.textContent = this.copiedText();
        this.isCopied.set(true);

        if (this.resetTimer) {
            clearTimeout(this.resetTimer);
        }

        this.resetTimer = setTimeout((): void => {
            this.element.nativeElement.textContent = this.originalText;
            this.isCopied.set(false);
            this.resetTimer = null;
        }, this.duration());
    }
}
