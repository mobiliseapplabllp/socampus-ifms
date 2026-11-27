import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KeyMgtPage } from './key-mgt.page';

describe('KeyMgtPage', () => {
  let component: KeyMgtPage;
  let fixture: ComponentFixture<KeyMgtPage>;

  beforeEach(async(() => {
    fixture = TestBed.createComponent(KeyMgtPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
