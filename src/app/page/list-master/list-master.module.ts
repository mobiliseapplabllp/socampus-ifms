import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ListMasterPageRoutingModule } from './list-master-routing.module';

import { ListMasterPage } from './list-master.page';
import { SubstringPipe } from 'src/app/pipes/substring.pipe';
// import { SharedModule } from 'src/app/shared/shared.module';
// import { SharedModule } from 'src/app/shared/shared.module';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ListMasterPageRoutingModule,
    // SharedModule

  ],
  declarations: [ListMasterPage, SubstringPipe],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ListMasterPageModule {}
