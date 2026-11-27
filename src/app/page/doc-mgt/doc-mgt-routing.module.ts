import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { DocMgtPage } from './doc-mgt.page';
import { DocCategoriesComponent } from './doc-categories/doc-categories.component';
import { DocListComponent } from './doc-list/doc-list.component';
import { DocDetailComponent } from './doc-detail/doc-detail.component';
import { DocUploadComponent } from './doc-upload/doc-upload.component';
import { DocTasksComponent } from './doc-tasks/doc-tasks.component';
import { DocNotificationsComponent } from './doc-notifications/doc-notifications.component';

const routes: Routes = [
  { path: '', component: DocMgtPage },
  { path: 'categories', component: DocCategoriesComponent },
  { path: 'list', component: DocListComponent },
  { path: 'detail/:id', component: DocDetailComponent },
  { path: 'upload', component: DocUploadComponent },
  { path: 'tasks', component: DocTasksComponent },
  { path: 'notifications', component: DocNotificationsComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DocMgtPageRoutingModule {}
