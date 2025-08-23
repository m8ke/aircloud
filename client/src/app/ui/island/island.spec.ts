import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Island } from './island';

describe('Island', () => {
  let component: Island;
  let fixture: ComponentFixture<Island>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Island]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Island);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
