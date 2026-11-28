import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { MailroomMgtPageRoutingModule } from './mailroom-mgt-routing.module';

import { MailroomMgtPage } from './mailroom-mgt.page';
import { MrHomeComponent } from './mr-home/mr-home.component';
import { MrPackagesComponent } from './mr-packages/mr-packages.component';
import { MrPackageDetailComponent } from './mr-package-detail/mr-package-detail.component';
import { MrReceiveComponent } from './mr-receive/mr-receive.component';
import { MrDeliverComponent } from './mr-deliver/mr-deliver.component';
import { MrRoundsComponent } from './mr-rounds/mr-rounds.component';
import { MrRoundDetailComponent } from './mr-round-detail/mr-round-detail.component';
import { MrExpectedComponent } from './mr-expected/mr-expected.component';
import { MrNotificationsComponent } from './mr-notifications/mr-notifications.component';
import { MyPackageComponent } from './my-package/my-package.component';
import { MrStoragePickerComponent } from './mr-pickers/mr-storage-picker.component';
import { MrRecipientPickerComponent } from './mr-pickers/mr-recipient-picker.component';
import { MrCodeComponent } from './mr-code/mr-code.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MailroomMgtPageRoutingModule
  ],
  declarations: [
    MailroomMgtPage,
    MrHomeComponent,
    MrPackagesComponent,
    MrPackageDetailComponent,
    MrReceiveComponent,
    MrDeliverComponent,
    MrRoundsComponent,
    MrRoundDetailComponent,
    MrExpectedComponent,
    MrNotificationsComponent,
    MyPackageComponent,
    MrStoragePickerComponent,
    MrRecipientPickerComponent,
    MrCodeComponent
  ]
})
export class MailroomMgtPageModule {}
