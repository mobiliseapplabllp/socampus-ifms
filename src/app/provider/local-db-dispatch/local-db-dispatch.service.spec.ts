import { TestBed } from '@angular/core/testing';

import { LocalDbDispatchService } from './local-db-dispatch.service';

describe('LocalDbDispatchService', () => {
  let service: LocalDbDispatchService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LocalDbDispatchService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
