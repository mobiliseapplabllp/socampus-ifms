import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MailroomMgtPage } from './mailroom-mgt.page';
import { MrHomeComponent } from './mr-home/mr-home.component';
import { MrPackagesComponent } from './mr-packages/mr-packages.component';
import { MrPackageDetailComponent } from './mr-package-detail/mr-package-detail.component';
import { MrReceiveComponent } from './mr-receive/mr-receive.component';
import { MrDeliverComponent } from './mr-deliver/mr-deliver.component';
import { MrRoundsComponent } from './mr-rounds/mr-rounds.component';
import { MrRoundDetailComponent } from './mr-round-detail/mr-round-detail.component';
import { MrExpectedComponent } from './mr-expected/mr-expected.component';
import { MrNotificationsComponent } from './mr-notifications/mr-notifications.component';
import { MyPackageComponent } from './my-package/my-package.component';

const routes: Routes = [
  // Entry: SSO -> panel / site choose -> home ya my-package
  { path: '', component: MailroomMgtPage },

  // Mail Room Panel (staff token)
  { path: 'home', component: MrHomeComponent },
  { path: 'packages', component: MrPackagesComponent },
  { path: 'package/:id', component: MrPackageDetailComponent },
  { path: 'receive', component: MrReceiveComponent },
  { path: 'deliver/:id', component: MrDeliverComponent },
  { path: 'rounds', component: MrRoundsComponent },
  { path: 'round/:id', component: MrRoundDetailComponent },
  { path: 'expected', component: MrExpectedComponent },
  { path: 'notifications', component: MrNotificationsComponent },

  // My Package (portal token)
  { path: 'my-package', component: MyPackageComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MailroomMgtPageRoutingModule {}
