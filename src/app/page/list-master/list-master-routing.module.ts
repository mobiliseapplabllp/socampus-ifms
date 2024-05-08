import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ListMasterPage } from './list-master.page';
import { CambroStatusComponent } from './cambro-status/cambro-status.component';

const routes: Routes = [
  {
    path: '',
    component: ListMasterPage
  }, {
    path: 'cambro-status',
    component: CambroStatusComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ListMasterPageRoutingModule {}
