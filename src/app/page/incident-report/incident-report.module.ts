import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { IncidentReportPageRoutingModule } from './incident-report-routing.module';

import { IncidentReportPage } from './incident-report.page';
import { IncidentAddComponent } from './incident-add/incident-add.component';
import { IncidentListComponent } from './incident-list/incident-list.component';
import { IncidentDetailComponent } from './incident-detail/incident-detail.component';
import { IncidentPickerComponent } from './incident-picker/incident-picker.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    IncidentReportPageRoutingModule
  ],
  declarations: [
    IncidentReportPage,
    IncidentAddComponent,
    IncidentListComponent,
    IncidentDetailComponent,
    IncidentPickerComponent
  ]
})
export class IncidentReportPageModule {}
