import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { VisitorMgtPageRoutingModule } from './visitor-mgt-routing.module';

import { VisitorMgtPage } from './visitor-mgt.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    VisitorMgtPageRoutingModule
  ],
  declarations: [VisitorMgtPage]
})
export class VisitorMgtPageModule {}
