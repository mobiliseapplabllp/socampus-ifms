import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { KeyMgtPageRoutingModule } from './key-mgt-routing.module';

import { KeyMgtPage } from './key-mgt.page';
import { KeyMgtHomeComponent } from './key-mgt-home/key-mgt-home.component';
import { KeyMgtKeysComponent } from './key-mgt-keys/key-mgt-keys.component';
import { AssignKeyComponent } from './assign-key/assign-key.component';
import { AddKeyComponent } from './add-key/add-key.component';
import { AvailKeyComponent } from './avail-key/avail-key.component';
import { LostkeyReportComponent } from './lostkey-report/lostkey-report.component';
import { KeyHistoryComponent } from './key-history/key-history.component';
import { RecoverLostComponent } from './recover-lost/recover-lost.component';
import { MarkReturnComponent } from './mark-return/mark-return.component';
import { NgOtpInputModule } from 'ng-otp-input';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
    KeyMgtPageRoutingModule,
    NgOtpInputModule
  ],
  declarations: [
    KeyMgtPage,
    KeyMgtHomeComponent,
    KeyMgtKeysComponent,
    AssignKeyComponent,
    AddKeyComponent,
    AvailKeyComponent,
    LostkeyReportComponent,
    KeyHistoryComponent,
    RecoverLostComponent,
    MarkReturnComponent
    
  ]
})
export class KeyMgtPageModule {}
