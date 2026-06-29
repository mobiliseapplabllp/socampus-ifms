import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { TodayOrderPageRoutingModule } from './today-order-routing.module';

import { TodayOrderPage } from './today-order.page';
import { OrderHistoryComponent } from './order-history/order-history.component';
import { OrderDetailComponent } from './order-detail/order-detail.component';
import { OrderHistoryDetailComponent } from './order-history-detail/order-history-detail.component';
import { OrderReceivedComponent } from './order-received/order-received.component';
import { DriverDetailComponent } from './driver-detail/driver-detail.component';
import { ReturnCmroComponent } from './return-cmro/return-cmro.component';
import { CkmsSiteComponent } from './ckms-site/ckms-site.component';
import { ReturnCaroDriverComponent } from './return-caro-driver/return-caro-driver.component';
import { ReturnCmroDriverDetailComponent } from './return-cmro-driver-detail/return-cmro-driver-detail.component';
import { OrderPackingComponent } from './order-packing/order-packing.component';
import { SharedModule } from 'src/app/shared/shared.module';
import { OrderPackingDetailComponent } from './order-packing-detail/order-packing-detail.component';
import { CkmsDashboardComponent } from './ckms-dashboard/ckms-dashboard.component';
@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ReactiveFormsModule,
    TodayOrderPageRoutingModule,
    SharedModule
  ],
  declarations: [
    TodayOrderPage,
    OrderHistoryComponent,
    OrderDetailComponent,
    OrderHistoryDetailComponent,
    OrderReceivedComponent,
    DriverDetailComponent,
    ReturnCmroComponent,
    CkmsSiteComponent,
    ReturnCaroDriverComponent,
    ReturnCmroDriverDetailComponent,
    OrderPackingComponent,
    OrderPackingDetailComponent,
    CkmsDashboardComponent
  ]
})
export class TodayOrderPageModule {}
