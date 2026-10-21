import { TestBed } from '@angular/core/testing';

import { CspService } from './csp.service';

describe('CspService', () => {
  let service: CspService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CspService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
