import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { LoginPageRoutingModule } from './login-routing.module';

import { LoginPage } from './login.page';
import { NgOtpInputModule } from  'ng-otp-input';
import { SplashComponent } from './splash/splash.component';
import { SharedModule } from 'src/app/shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ReactiveFormsModule,
    LoginPageRoutingModule,
    NgOtpInputModule,
    SharedModule
  ],
  declarations: [
    LoginPage,
    SplashComponent
  ]
})
export class LoginPageModule {}
