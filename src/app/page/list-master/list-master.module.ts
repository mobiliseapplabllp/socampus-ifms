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
import { DashboardComponent } from './dashboard/dashboard.component';
import { ChartDashboardComponent } from './chart-dashboard/chart-dashboard.component';
import { OfflineDataComponent } from './offline-data/offline-data.component';
import { MenuComponent } from './menu/menu.component';
import { PendingTaskComponent } from './pending-task/pending-task.component';
import { SharedModule } from 'src/app/shared/shared.module';
import { ComplaintPageModule } from '../complaint/complaint.module';
import { SosComponent } from './sos/sos.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ListMasterPageRoutingModule,
    ComplaintPageModule,
    SharedModule
  ],
  declarations: [
    ListMasterPage,
    SubstringPipe,
    DashboardComponent,
    MenuComponent,
    PendingTaskComponent,
    ChartDashboardComponent,
    OfflineDataComponent,
    SosComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ListMasterPageModule {}
