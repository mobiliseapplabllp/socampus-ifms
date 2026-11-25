import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ParkingMgtPageRoutingModule } from './parking-mgt-routing.module';

import { ParkingMgtPage } from './parking-mgt.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ParkingMgtPageRoutingModule
  ],
  declarations: [ParkingMgtPage]
})
export class ParkingMgtPageModule {}
