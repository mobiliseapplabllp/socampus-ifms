import { Component, OnInit } from '@angular/core';
import { AlertController, ModalController, Platform } from '@ionic/angular';
import { ConciergeService } from 'src/app/provider/concierge/concierge.service';
import { SiteComponent } from './site/site.component';
import { ConcHistoryComponent } from './conc-history/conc-history.component';
import { Router } from '@angular/router';
import { CommonService } from 'src/app/provider/common/common.service';
import { environment } from 'src/environments/environment';
import { AssignUserComponent } from './assign-user/assign-user.component';
import { LocationTracker } from 'capacitor-location-tracker-sqlite';

@Component({
  selector: 'app-concierge',
  templateUrl: './concierge.page.html',
  styleUrls: ['./concierge.page.scss'],
})
export class ConciergePage implements OnInit {
  status = 'assignto';
  dashboard: any = {};
  ticketData: any = [];
  userData: any = [];
  constructor(
    private httpConcierge: ConciergeService,
    private modalCtrl: ModalController,
    private router: Router,
    private common: CommonService,
    private alertController: AlertController,
    private platform: Platform
  ) { }

  ngOnInit() {
    this.userData = JSON.parse(localStorage.getItem('user')!);   
  }

  ionViewDidEnter() {
    if (this.platform.is('capacitor')) {
      void this.ensureLocationTrackingReadinessOnEntry();
    }
    this.getTicketList();
  }

  getTicketList(ticketType?: string) {
    const obj: any = {
      page: 1,
      limit: 10,
      export: 0,
      search: "",
      ticketType: ticketType ? ticketType : 'assignto',                 
    }
    if (this.status === 'assignto') {
      obj.status = [1,2,3,5]
    }
    if (this.status === 'completed' ) {
      obj.status = [4,6];
    }
    this.common.presentLoading().then(preLoad => {
      this.httpConcierge.getTicketList(obj).subscribe({
        next:(data: any) => {
          if (data.status) {
            this.dashboard = data.tcktCount;
            this.ticketData = data.data.data;                        
          } else {
            this.common.presentToast(data.msg, 'warning');
          }

        },
        error:() => {
          this.common.dismissloading();
          this.common.presentToast(environment.errMsg, 'danger');
        },
        complete:() => {
          this.common.dismissloading();
        }
      });
    });

  }

  async openSite(data: any) {
    const modal = await this.modalCtrl.create({
      component: SiteComponent,
      cssClass: 'my-modal',
      componentProps: {
        requestedData: data
      }
    });
    modal.present();
  }

  async openHistory(data: any) {
    const modal = await this.modalCtrl.create({
      component: ConcHistoryComponent,
      mode: 'md',
      cssClass: 'my-modal-btm',
      initialBreakpoint: 1,
      breakpoints: [1],
      componentProps: {
        id: data.id,
        tab: this.status
      }
    });
    modal.present();
  }

  async assignUser(data: any) {
    const modal = await this.modalCtrl.create({
      component: AssignUserComponent,
      mode: 'md',
      cssClass: 'my-modal-btm',
      initialBreakpoint: 1,
      breakpoints: [1],
      componentProps: {
        id: data.id,
        tab: this.status
      }
    });

    modal.onWillDismiss().then(async disModal => {
      if (disModal.role) {
        this.getTicketList(this.status);
      }
    });
    modal.present();
  }

  workNow(data: any, type: string) {    
    this.router.navigate(['/concierge/conc-work'], {
      queryParams: {
        data: JSON.stringify(data),
        tab: this.status,
        type:type
      }
    });
  }

  changeSegment(event: any) {
    this.dashboard = {};
    this.ticketData = [];
    this.status = event.detail.value;
    this.getTicketList(this.status);
  }

  createTicket() {
    this.router.navigateByUrl('/concierge/cr-ticket');
  }

  async presentAlertConfirm(data: any) {
    const alert = await this.alertController.create({
      cssClass: 'my-custom-class',
      header: 'RE-Open?',
      message: 'Are you sure you want to RE-Open ' + data.id,
      mode: 'ios',
      inputs: [{
        name: 'remark',
        type:'textarea',
        placeholder: 'Enter Remarks',
      }],
      buttons: [{
        text: 'Cancel',
          handler: (data) => {
          }
        },{
          text: 'YES',
          handler: (dat) => {
            if(dat.remark){
              const obj = {
                source: environment.source,
                remark: dat.remark,
                tckt: data.id,
                status: 5
              }
              this.actionReOpen(obj);
            } else {
              this.common.presentToast('Please Enter Remark', 'warning');
            }
          }
        }]
    });
    await alert.present();
  }

  actionReOpen(obj: any) {
    console.log(obj);
    this.common.presentLoading().then(preLoad => {
      this.httpConcierge.reOpenAction(obj).subscribe({
        next:(data: any) => {
          if (data.status) {
            this.dashboard = {};
            this.ticketData = [];
            this.common.presentToast(data.msg, 'success');
            this.getTicketList(this.status);
          } else {            
            this.common.presentToast(data.msg, 'warning');
          }
        },
        error:() => {
          this.common.dismissloading();
          this.common.presentToast(environment.errMsg, 'danger');
        },
        complete:() => {
          this.common.dismissloading(); 
        }
      });
    })
  }

  private async ensureLocationTrackingReadinessOnEntry() {
    try {
      // abc
      let hasBackgroundPermission = await this.checkBackgroundPermission();

      // Must call native permission APIs first — iOS/Android system dialogs live inside
      // requestBackgroundPermissions(), not in our alert. Old flow only ran that after
      // "Open Settings", so users who tapped "Not now" never saw any system prompt.
      if (!hasBackgroundPermission) {
        await LocationTracker.requestBackgroundPermissions();
        // iOS: authorization updates arrive asynchronously on the native delegate;
        // an immediate re-check often reads stale state and skips the Settings path.
        if (this.platform.is('ios')) {
          await new Promise<void>(resolve => setTimeout(resolve, 600));
        }
        hasBackgroundPermission = await this.checkBackgroundPermission();
      }

      if (!hasBackgroundPermission) {
        const shouldOpenSettings = await this.showSettingsPrompt(
          'Location Permission Required',
          this.platform.is('ios')
            ? 'Turn on Location and set it to "Always" for background GPS trips. You can open Settings to change this.'
            : 'Please allow location access all the time for accurate background tracking.'
        );

        if (shouldOpenSettings) {
          await LocationTracker.requestBackgroundPermissions();
          if (this.platform.is('ios')) {
            await new Promise<void>(resolve => setTimeout(resolve, 600));
          }
          hasBackgroundPermission = await this.checkBackgroundPermission();
        }
        if (!hasBackgroundPermission) {
          return;
        }
      }

      // Android only: iOS has no battery optimization API; plugin stubs return allowed=true.
      if (this.platform.is('android')) {
        const batteryOptimizationIgnored = await this.checkBatteryOptimization();
        if (!batteryOptimizationIgnored) {
          const shouldOpenBatterySettings = await this.showSettingsPrompt(
            'Battery Optimization',
            'Please disable battery optimization for this app to keep background tracking active.'
          );

          if (shouldOpenBatterySettings) {
            await LocationTracker.requestIgnoreBatteryOptimizations();
          }
        }
      }
    } catch (e) {
      console.error('ensureLocationTrackingReadinessOnEntry', e);
      this.common.presentToast('Could not complete location permission setup.', 'warning');
    }
  }

  private async checkBackgroundPermission() {
    const { allowed } = await LocationTracker.requestBackgroundPermissionsCheck();
    return allowed;
  }

  private async checkBatteryOptimization() {
    const { allowed } = await LocationTracker.requestIgnoreBatteryOptimizationsCheck();
    return allowed;
  }

  private async showSettingsPrompt(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      mode: this.platform.is('ios') ? 'ios' : 'md',
      buttons: [
        {
          text: 'Not now',
          role: 'cancel'
        },
        {
          text: 'Open Settings',
          role: 'confirm'
        }
      ]
    });

    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role === 'confirm';
  }

}
