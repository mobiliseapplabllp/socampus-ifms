import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { LocationQrPage } from './location-qr.page';

const routes: Routes = [
  {
    path: '',
    component: LocationQrPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class LocationQrPageRoutingModule {}
