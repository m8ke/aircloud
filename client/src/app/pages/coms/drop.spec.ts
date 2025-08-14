import { ComponentFixture, TestBed } from "@angular/core/testing";

import { Drop } from "@/pages/coms/drop";

describe("Drop", () => {
    let component: Drop;
    let fixture: ComponentFixture<Drop>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [Drop],
        })
            .compileComponents();

        fixture = TestBed.createComponent(Drop);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
