import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ParkingMgtPage } from './parking-mgt.page';

const routes: Routes = [
  {
    path: '',
    component: ParkingMgtPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ParkingMgtPageRoutingModule {}
