import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { DocMgtPageRoutingModule } from './doc-mgt-routing.module';

import { DocMgtPage } from './doc-mgt.page';
import { DocCategoriesComponent } from './doc-categories/doc-categories.component';
import { DocListComponent } from './doc-list/doc-list.component';
import { DocDetailComponent } from './doc-detail/doc-detail.component';
import { DocUploadComponent } from './doc-upload/doc-upload.component';
import { DocTasksComponent } from './doc-tasks/doc-tasks.component';
import { DocNotificationsComponent } from './doc-notifications/doc-notifications.component';
import { DocPickerComponent } from './doc-picker/doc-picker.component';
import { DocSkeletonComponent } from './doc-skeleton/doc-skeleton.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    DocMgtPageRoutingModule
  ],
  declarations: [
    DocMgtPage,
    DocCategoriesComponent,
    DocListComponent,
    DocDetailComponent,
    DocUploadComponent,
    DocTasksComponent,
    DocNotificationsComponent,
    DocPickerComponent,
    DocSkeletonComponent
  ]
})
export class DocMgtPageModule {}
