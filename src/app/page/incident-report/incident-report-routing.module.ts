import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { IncidentReportPage } from './incident-report.page';
import { IncidentAddComponent } from './incident-add/incident-add.component';
import { IncidentListComponent } from './incident-list/incident-list.component';
import { IncidentDetailComponent } from './incident-detail/incident-detail.component';

const routes: Routes = [
  {
    path: '',
    component: IncidentReportPage
  },
  {
    path: 'add',
    component: IncidentAddComponent
  },
  {
    path: 'list',
    component: IncidentListComponent
  },
  {
    path: 'detail/:id',
    component: IncidentDetailComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class IncidentReportPageRoutingModule {}
