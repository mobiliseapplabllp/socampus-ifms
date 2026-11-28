import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { BarcodeComponent } from './shared/barcode/barcode.component';

const routes: Routes = [
  // {
  //   path: '',
  //   redirectTo: '/login',
  //   pathMatch: 'full'
  // },
  {
    path: 'login',
    loadChildren: () => import('./page/login/login.module').then(m => m.LoginPageModule)
  },
  {
    path: 'list-master',
    loadChildren: () => import('./page/list-master/list-master.module').then( m => m.ListMasterPageModule)
  },
  {
    path: 'add-asset',
    loadChildren: () => import('./page/add-asset/add-asset.module').then( m => m.AddAssetPageModule)
  },
  {
    path: 'complaint',
    loadChildren: () => import('./page/complaint/complaint.module').then( m => m.ComplaintPageModule)
  },
  {
    path: 'digital-checklist',
    loadChildren: () => import('./page/digital-checklist/digital-checklist.module').then( m => m.DigitalChecklistPageModule)
  },
  {
    path: 'app/attendance',
    loadChildren:() => import('./page/attendnce/attendnce.module').then(m => m.AttendncePageModule)
  },
  {
    path: 'manuals',
    loadChildren: () => import('./page/manuals/manuals.module').then( m => m.ManualsPageModule)
  },
  {
    path: 'forgot-password',
    loadChildren: () => import('./page/forgot-password/forgot-password.module').then( m => m.ForgotPasswordPageModule)
  },
  {
    path: 'register',
    loadChildren: () => import('./page/register/register.module').then( m => m.RegisterPageModule)
  },
  {
    path: 'menu-roaster',
    loadChildren: () => import('./page/menu-roaster/menu-roaster.module').then( m => m.MenuRoasterPageModule)
  },
  {
    path: 'pm-calibration',
    loadChildren: () => import('./page/pm-cal/pm-cal.module').then( m => m.PmCalPageModule)
  },
  {
    path: 'barcode',
    component: BarcodeComponent
  },
  {
    path: 'meal-checking',
    loadChildren: () => import('./page/meal-checkin/meal-checkin.module').then( m => m.MealCheckinPageModule)
  },
  {
    path: 'indents',
    loadChildren: () => import('./page/indents/indents.module').then( m => m.IndentsPageModule)
  },
  {
    path: 'meter',
    loadChildren: () => import('./page/meter/meter.module').then( m => m.MeterPageModule)
  },  
  {
    path: 't-order/:id',
    loadChildren: () => import('./page/today-order/today-order.module').then( m => m.TodayOrderPageModule)
  },
  {
    path: 'today-order',
    loadChildren: () => import('./page/today-order/today-order.module').then( m => m.TodayOrderPageModule)
  },
  {
    path: 'approvals',
    loadChildren: () => import('./page/approvals/approvals.module').then( m => m.ApprovalsPageModule)
  },
  {
    path: 'concierge',
    loadChildren: () => import('./page/concierge/concierge.module').then( m => m.ConciergePageModule)
  },
  {
    path: 'notification',
    loadChildren: () => import('./page/notification/notification.module').then( m => m.NotificationPageModule)
  },
  {
    path: 'location-qr',
    loadChildren: () => import('./page/location-qr/location-qr.module').then( m => m.LocationQrPageModule)
  },
  {
    path: 'space-mgt',
    loadChildren: () => import('./page/space-mgt/space-mgt.module').then( m => m.SpaceMgtPageModule)
  },
  {
    path: 'parking-mgt',
    loadChildren: () => import('./page/parking-mgt/parking-mgt.module').then( m => m.ParkingMgtPageModule)
  },
  {
    path: 'visitor-mgt',
    loadChildren: () => import('./page/visitor-mgt/visitor-mgt.module').then( m => m.VisitorMgtPageModule)
  },
  {
    path: 'key-mgt',
    loadChildren: () => import('./page/key-mgt/key-mgt.module').then( m => m.KeyMgtPageModule)
  },
  {
    path: 'mailroom-mgt',
    loadChildren: () => import('./page/mailroom-mgt/mailroom-mgt.module').then( m => m.MailroomMgtPageModule)
  },
  {
    path: 'somart',
    loadChildren: () => import('./page/somart/somart.module').then( m => m.SomartPageModule)
  },
  {
    path: 'incident-report',
    loadChildren: () => import('./page/incident-report/incident-report.module').then( m => m.IncidentReportPageModule)
  },
  {
    path: 'doc-mgt',
    loadChildren: () => import('./page/doc-mgt/doc-mgt.module').then( m => m.DocMgtPageModule)
  },
  {
    path: 'feedback',
    loadChildren: () => import('./page/feedback/feedback.module').then( m => m.FeedbackPageModule)
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
