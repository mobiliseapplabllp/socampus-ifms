import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { LoginPage } from './login.page';
import { SplashComponent } from './splash/splash.component';

const routes: Routes = [
  {
    path: '',
    component: LoginPage
  }, {
    path: 'splash',
    component: SplashComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class LoginPageRoutingModule {}
