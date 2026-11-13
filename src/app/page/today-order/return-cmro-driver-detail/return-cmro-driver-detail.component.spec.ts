import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { ReturnCmroDriverDetailComponent } from './return-cmro-driver-detail.component';

describe('ReturnCmroDriverDetailComponent', () => {
  let component: ReturnCmroDriverDetailComponent;
  let fixture: ComponentFixture<ReturnCmroDriverDetailComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ ReturnCmroDriverDetailComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(ReturnCmroDriverDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
