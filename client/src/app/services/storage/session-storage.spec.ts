import { TestBed } from '@angular/core/testing';

import { SessionStorage } from './session-storage';

describe('SessionStorage', () => {
  let service: SessionStorage;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SessionStorage);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
