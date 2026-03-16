import { TestBed } from '@angular/core/testing';

import { QrScanner } from './qr-scanner';

describe('QrScanner', () => {
  let service: QrScanner;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(QrScanner);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
