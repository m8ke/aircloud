import { TestBed } from "@angular/core/testing";

import { FileManager } from "./file-manager";

describe("FileManager", () => {
    let service: FileManager;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(FileManager);
    });

    it("should be created", () => {
        expect(service).toBeTruthy();
    });
});
