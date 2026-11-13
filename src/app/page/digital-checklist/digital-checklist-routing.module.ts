import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { DigitalChecklistPage } from './digital-checklist.page';
import { FillReportComponent } from './fill-report/fill-report.component';
import { JustificationComponent } from './justification/justification.component';

const routes: Routes = [
  {
    path: '',
    component: DigitalChecklistPage
  }, {
    path: 'fill-report/:id/:behalf',
    component: FillReportComponent
  }, {
    path: 'fill-report',
    component: FillReportComponent
  }, {
    path: 'justification',
    component: JustificationComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DigitalChecklistPageRoutingModule {}
