import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ListMasterPage } from './list-master.page';
import { DashboardComponent } from './dashboard/dashboard.component';
import { ChartDashboardComponent } from './chart-dashboard/chart-dashboard.component';
import { OfflineDataComponent } from './offline-data/offline-data.component';
import { MenuComponent } from './menu/menu.component';
import { PendingTaskComponent } from './pending-task/pending-task.component';
import { ComplaintCardsComponent } from '../complaint/complaint-cards/complaint-cards.component';
import { SosComponent } from './sos/sos.component';

const routes: Routes = [
  {
    path: '',
    component: ListMasterPage
  }, {
    path: 'dashboard',
    component: DashboardComponent
  }, {
    path: 'offline-data',
    component: OfflineDataComponent
  }, {
    path: 'menu',
    component: MenuComponent
  }, {
    path: 'pending-task',
    component: PendingTaskComponent
  }, {
    path: 'chart-dashboard',
    component: ChartDashboardComponent
  }, {
    path: 'complaint-card',
    component: ComplaintCardsComponent
  }, {
    path: 'sos',
    component: SosComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ListMasterPageRoutingModule {}
