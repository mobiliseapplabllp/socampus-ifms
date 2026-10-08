import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { IndentsPageRoutingModule } from './indents-routing.module';

import { IndentsPage } from './indents.page';
import { IndentCardComponent } from './indent-card/indent-card.component';
import { CrIndentComponent } from './cr-indent/cr-indent.component';
import { SparePartsComponent } from './spare-parts/spare-parts.component';
import { MaterialDetailsComponent } from './material-details/material-details.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ReactiveFormsModule,
    IndentsPageRoutingModule
  ],
  declarations: [
    IndentsPage,
    IndentCardComponent,
    CrIndentComponent,
    SparePartsComponent,
    MaterialDetailsComponent
  ]
})
export class IndentsPageModule {}
