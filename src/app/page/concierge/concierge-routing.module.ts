import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ConciergePage } from './concierge.page';
import { SiteComponent } from './site/site.component';
import { ConcHistoryComponent } from './conc-history/conc-history.component';
import { ConcWorkComponent } from './conc-work/conc-work.component';
import { AssignUserComponent } from './assign-user/assign-user.component';
import { CrConcComponent } from './cr-conc/cr-conc.component';
import { ConcMenuComponent } from './conc-menu/conc-menu.component';

const routes: Routes = [
  {
    path: '',
    component: ConciergePage
  },
  {
    path: 'site',
    component: SiteComponent
  },
  {
    path: 'cons-history',
    component: ConcHistoryComponent
  },
  {
    path: 'conc-work',
    component: ConcWorkComponent
  },
  {
    path: 'assign-user',
    component: AssignUserComponent
  },
  {
    path: 'cr-ticket',
    component: CrConcComponent
  },
  {
    path: 'conc-menu',
    component: ConcMenuComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ConciergePageRoutingModule {}
