import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { MailroomMgtPageRoutingModule } from './mailroom-mgt-routing.module';

import { MailroomMgtPage } from './mailroom-mgt.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MailroomMgtPageRoutingModule
  ],
  declarations: [MailroomMgtPage]
})
export class MailroomMgtPageModule {}
