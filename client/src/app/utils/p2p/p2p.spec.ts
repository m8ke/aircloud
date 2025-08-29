import { TestBed } from "@angular/core/testing";

import { P2P } from "@/utils/p2p/p2p";

describe("Socket", () => {
    let service: P2P;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(P2P);
    });

    it("should be created", () => {
        expect(service).toBeTruthy();
    });
});
