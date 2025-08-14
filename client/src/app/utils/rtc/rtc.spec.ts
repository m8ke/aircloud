import { TestBed } from "@angular/core/testing";
import { RTC } from "@/utils/rtc/rtc";

describe("RTC", () => {
    let service: RTC;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(RTC);
    });

    it("should be created", () => {
        expect(service).toBeTruthy();
    });
});
