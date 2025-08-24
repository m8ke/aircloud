import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotificationFileRequest } from './notification-file-request';

describe('NotificationFileRequest', () => {
  let component: NotificationFileRequest;
  let fixture: ComponentFixture<NotificationFileRequest>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationFileRequest]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NotificationFileRequest);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
