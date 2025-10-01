import { TestBed } from "@angular/core/testing";

import { Modal } from "./modal";

describe("Modal", () => {
    let service: Modal;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(Modal);
    });

    it("should be created", () => {
        expect(service).toBeTruthy();
    });
});
