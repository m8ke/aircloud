import { TestBed } from '@angular/core/testing';

import { Uploader } from './uploader';

describe('Uploader', () => {
  let service: Uploader;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Uploader);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
