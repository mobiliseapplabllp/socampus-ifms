import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { LocationQrPageRoutingModule } from './location-qr-routing.module';

import { LocationQrPage } from './location-qr.page';
import { SharedModule } from 'src/app/shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    LocationQrPageRoutingModule,
    SharedModule
  ],
  declarations: [LocationQrPage]
})
export class LocationQrPageModule {}
