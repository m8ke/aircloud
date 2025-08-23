import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotificationInfo } from './notification-info';

describe('NotificationInfo', () => {
  let component: NotificationInfo;
  let fixture: ComponentFixture<NotificationInfo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationInfo]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NotificationInfo);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
