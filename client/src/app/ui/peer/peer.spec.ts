import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Peer } from './peer';

describe('Peer', () => {
  let component: Peer;
  let fixture: ComponentFixture<Peer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Peer]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Peer);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
