import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { SpaceMgtPageRoutingModule } from './space-mgt-routing.module';

import { SpaceMgtPage } from './space-mgt.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SpaceMgtPageRoutingModule
  ],
  declarations: [SpaceMgtPage]
})
export class SpaceMgtPageModule {}
