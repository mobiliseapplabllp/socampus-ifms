import { TestBed } from '@angular/core/testing';

import { ConciergeService } from './concierge.service';

describe('ConciergeService', () => {
  let service: ConciergeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ConciergeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
