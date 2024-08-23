import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ApprovalsPageRoutingModule } from './approvals-routing.module';

import { ApprovalsPage } from './approvals.page';
import { PtwApprovalComponent } from './ptw-approval/ptw-approval.component';
import { PpmPtwComponent } from './ppm-ptw/ppm-ptw.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ApprovalsPageRoutingModule
  ],
  declarations: [
    ApprovalsPage,
    PtwApprovalComponent,
    PpmPtwComponent]
})
export class ApprovalsPageModule {}
