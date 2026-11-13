import { TestBed } from '@angular/core/testing';

import { TodayOrderService } from './today-order.service';

describe('TodayOrderService', () => {
  let service: TodayOrderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TodayOrderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
