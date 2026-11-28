import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SomartPage } from './somart.page';
import { SmCartComponent } from './sm-cart/sm-cart.component';
import { SmOrdersComponent } from './sm-orders/sm-orders.component';
import { SmOrderDetailComponent } from './sm-order-detail/sm-order-detail.component';
import { SmReceiveComponent } from './sm-receive/sm-receive.component';
import { SmApprovalsComponent } from './sm-approvals/sm-approvals.component';
import { SmUpdatesComponent } from './sm-updates/sm-updates.component';

const routes: Routes = [
  { path: '', component: SomartPage },                       // home: catalogue
  { path: 'cart', component: SmCartComponent },              // cart + checkout
  { path: 'orders', component: SmOrdersComponent },          // my orders / site orders
  { path: 'order/:orderNo', component: SmOrderDetailComponent },
  { path: 'receive/:orderNo/:dcNo', component: SmReceiveComponent },
  { path: 'approvals', component: SmApprovalsComponent },
  { path: 'updates', component: SmUpdatesComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SomartPageRoutingModule {}
