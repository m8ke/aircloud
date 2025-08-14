import { TestBed } from "@angular/core/testing";

import { Compression } from "@/utils/compression/compression";

describe("Compression", () => {
    let service: Compression;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(Compression);
    });

    it("should be created", () => {
        expect(service).toBeTruthy();
    });
});
