import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ApprovalsPage } from './approvals.page';
import { PtwApprovalComponent } from './ptw-approval/ptw-approval.component';

const routes: Routes = [
  {
    path: '',
    component: ApprovalsPage
  }, {
    path: 'ptw-approval',
    component: PtwApprovalComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ApprovalsPageRoutingModule {}
