import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { KeyMgtPage } from './key-mgt.page';
import { KeyMgtHomeComponent } from './key-mgt-home/key-mgt-home.component';
import { KeyMgtKeysComponent } from './key-mgt-keys/key-mgt-keys.component';
import { AssignKeyComponent } from './assign-key/assign-key.component';
import { AddKeyComponent } from './add-key/add-key.component';
import { AvailKeyComponent } from './avail-key/avail-key.component';
import { LostkeyReportComponent } from './lostkey-report/lostkey-report.component';
import { KeyHistoryComponent } from './key-history/key-history.component';
import { RecoverLostComponent } from './recover-lost/recover-lost.component';
import { MarkReturnComponent } from './mark-return/mark-return.component';

const routes: Routes = [
  {
    path: 'tabs',
    component: KeyMgtPage,
    children: [
      {
        path: 'home',
        component: KeyMgtHomeComponent
      },
      {
        path: 'keys',
        component: KeyMgtKeysComponent
      }      
    ]
  },
  {
    path: 'assign-key',
    component: AssignKeyComponent
  },
  {
    path: 'add-key',
    component: AddKeyComponent
  },
  {
    path: 'avail-key',
    component: AvailKeyComponent
  },
  {
    path: 'lostkey-report',
    component: LostkeyReportComponent
  },
  {
    path: 'key-history',
    component: KeyHistoryComponent
  },
  {
    path: 'recover-lost',
    component: RecoverLostComponent
  },
  {
    path: 'mark-return',
    component: MarkReturnComponent
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class KeyMgtPageRoutingModule {}
