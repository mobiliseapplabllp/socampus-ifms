import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { SomartPageRoutingModule } from './somart-routing.module';

import { SomartPage } from './somart.page';
import { SmCartComponent } from './sm-cart/sm-cart.component';
import { SmOrdersComponent } from './sm-orders/sm-orders.component';
import { SmOrderDetailComponent } from './sm-order-detail/sm-order-detail.component';
import { SmReceiveComponent } from './sm-receive/sm-receive.component';
import { SmApprovalsComponent } from './sm-approvals/sm-approvals.component';
import { SmUpdatesComponent } from './sm-updates/sm-updates.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SomartPageRoutingModule
  ],
  declarations: [
    SomartPage,
    SmCartComponent,
    SmOrdersComponent,
    SmOrderDetailComponent,
    SmReceiveComponent,
    SmApprovalsComponent,
    SmUpdatesComponent
  ]
})
export class SomartPageModule {}
