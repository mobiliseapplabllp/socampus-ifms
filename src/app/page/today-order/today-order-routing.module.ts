import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { TodayOrderPage } from './today-order.page';
import { OrderHistoryComponent } from './order-history/order-history.component';
import { OrderDetailComponent } from './order-detail/order-detail.component';
import { OrderHistoryDetailComponent } from './order-history-detail/order-history-detail.component';
import { OrderReceivedComponent } from './order-received/order-received.component';
import { DriverDetailComponent } from './driver-detail/driver-detail.component';
import { ReturnCmroComponent } from './return-cmro/return-cmro.component';
import { CkmsSiteComponent } from './ckms-site/ckms-site.component';

const routes: Routes = [
  {
    path: '',
    component: TodayOrderPage
  }, {
    path: 'order-history',
    component: OrderHistoryComponent
  }, {
    path: 'order-detail',
    component: OrderDetailComponent
  }, {
    path: 'order-history-detail',
    component: OrderHistoryDetailComponent
  }, {
    path: 'order-received',
    component: OrderReceivedComponent
  }, {
    path: 'driver-detail',
    component: DriverDetailComponent
  }, {
    path: 'return-cmro',
    component: ReturnCmroComponent
  }, {
    path: 'ckms-site',
    component: CkmsSiteComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TodayOrderPageRoutingModule {}
