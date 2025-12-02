import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ApprovalsPage } from './approvals.page';
import { PtwApprovalComponent } from './ptw-approval/ptw-approval.component';
import { PpmPtwComponent } from './ppm-ptw/ppm-ptw.component';
import { TicketHoldComponent } from './ticket-hold/ticket-hold.component';
import { PpmHoldComponent } from './ppm-hold/ppm-hold.component';

const routes: Routes = [
  {
    path: '',
    component: ApprovalsPage
  }, {
    path: 'ptw-approval',
    component: PtwApprovalComponent
  }, {
    path: 'ppm-ptw',
    component: PpmPtwComponent
  },{
    path: 'ticket-hold',
    component:TicketHoldComponent
  },{
    path: 'ppm-hold',
    component: PpmHoldComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ApprovalsPageRoutingModule {}
