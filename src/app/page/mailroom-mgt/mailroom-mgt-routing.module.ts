import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MailroomMgtPage } from './mailroom-mgt.page';

const routes: Routes = [
  {
    path: '',
    component: MailroomMgtPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MailroomMgtPageRoutingModule {}
