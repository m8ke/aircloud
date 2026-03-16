import { TestBed } from '@angular/core/testing';

import { Env } from './env';

describe('Env', () => {
  let service: Env;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Env);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
