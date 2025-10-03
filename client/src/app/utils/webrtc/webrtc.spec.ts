import { TestBed } from '@angular/core/testing';

import { Webrtc } from './webrtc';

describe('Webrtc', () => {
  let service: Webrtc;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Webrtc);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
