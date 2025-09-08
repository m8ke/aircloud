import { computed, Injectable, signal, Signal } from "@angular/core";

interface ModalState {
    isOpen: boolean;
    data?: unknown;
}

@Injectable({providedIn: "root"})
export class ModalService {
    private readonly modals = signal<Record<string, ModalState>>({});

    public isOpen(id: string): Signal<boolean> {
        return computed(() => !!this.modals()[id]?.isOpen);
    }

    public open(id: string, data?: unknown): void {
        this.modals.update((m) => ({
            ...m,
            [id]: {isOpen: true, data},
        }));
    }

    public close(id: string): void {
        this.modals.update((m) => ({
            ...m,
            [id]: {...(m[id] ?? {}), isOpen: false},
        }));
    }

    public getData<T = unknown>(id: string): T | undefined {
        return this.modals()[id]?.data as T;
    }
}
