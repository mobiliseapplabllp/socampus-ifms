import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ConciergePageRoutingModule } from './concierge-routing.module';

import { ConciergePage } from './concierge.page';
import { SiteComponent } from './site/site.component';
import { ConcHistoryComponent } from './conc-history/conc-history.component';
import { ConcWorkComponent } from './conc-work/conc-work.component';
import { AssignUserComponent } from './assign-user/assign-user.component';
import { CrConcComponent } from './cr-conc/cr-conc.component';
import { SharedModule } from 'src/app/shared/shared.module';
import { TripLogsComponent } from './trip-logs/trip-logs.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ReactiveFormsModule,
    ConciergePageRoutingModule,
    SharedModule,    
  ],
  declarations: [
    ConciergePage,
    SiteComponent,
    ConcHistoryComponent,
    ConcWorkComponent,
    AssignUserComponent,
    CrConcComponent,
    TripLogsComponent
  ]
})
export class ConciergePageModule {}
