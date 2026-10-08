import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ApprovalsPage } from './approvals.page';
import { PtwApprovalComponent } from './ptw-approval/ptw-approval.component';
import { PpmPtwComponent } from './ppm-ptw/ppm-ptw.component';
import { TicketHoldComponent } from './ticket-hold/ticket-hold.component';
import { PpmHoldComponent } from './ppm-hold/ppm-hold.component';
import { IndentApprovalComponent } from './indent-approval/indent-approval.component';
import { StockAdjustComponent } from './stock-adjust/stock-adjust.component';

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
  },
  {
    path: 'indent-approval',
    component: IndentApprovalComponent
  },
  {
    path: 'stock-adjust',
    component: StockAdjustComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ApprovalsPageRoutingModule {}
