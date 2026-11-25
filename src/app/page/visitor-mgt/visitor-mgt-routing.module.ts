import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { VisitorMgtPage } from './visitor-mgt.page';

const routes: Routes = [
  {
    path: '',
    component: VisitorMgtPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class VisitorMgtPageRoutingModule {}
