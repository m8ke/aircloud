import { ComponentFixture, TestBed } from "@angular/core/testing";

import { Dropzone } from "@/pages/dropzone/dropzone";

describe("Drop", () => {
    let component: Dropzone;
    let fixture: ComponentFixture<Dropzone>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [Dropzone],
        })
            .compileComponents();

        fixture = TestBed.createComponent(Dropzone);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
