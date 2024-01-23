import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ListMasterPage } from './list-master.page';
import { DashboardComponent } from './dashboard/dashboard.component';
import { MenuComponent } from './menu/menu.component';
import { PendingTaskComponent } from './pending-task/pending-task.component';
import { ChartDashboardComponent } from './chart-dashboard/chart-dashboard.component';

const routes: Routes = [
  {
    path: '',
    component: ListMasterPage
  }, {
    path: 'dashboard',
    component: DashboardComponent
  }, {
    path: 'menu',
    component: MenuComponent
  }, {
    path: 'pending-task',
    component: PendingTaskComponent
  }, {
    path: 'chart-dashboard',
    component: ChartDashboardComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ListMasterPageRoutingModule {}
