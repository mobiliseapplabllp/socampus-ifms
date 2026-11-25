import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { KeyMgtPageRoutingModule } from './key-mgt-routing.module';

import { KeyMgtPage } from './key-mgt.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    KeyMgtPageRoutingModule
  ],
  declarations: [KeyMgtPage]
})
export class KeyMgtPageModule {}
