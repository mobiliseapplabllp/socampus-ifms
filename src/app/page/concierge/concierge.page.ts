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
import { TripLogsComponent } from './trip-logs/trip-logs.component';

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
      let hasBackgroundPermission = await this.checkBackgroundPermission();

      if (!hasBackgroundPermission) {
        const goToSettings = await this.showLocationAlwaysInstructionModal();
        if (!goToSettings) {
          return;
        }
        // Settings app kholega — user wapis aane par ionViewDidEnter dobara fire hoga
        // aur tab permission re-check hogi. Yahan immediate re-check karna galat hai
        // kyunki 600ms mein user permission grant karke wapis nahi aa sakta.
        await LocationTracker.requestBackgroundPermissions();
        return;
      }

      if (this.platform.is('android')) {
        await this.ensureBatteryOptimizationIgnored();
      }
    } catch (e) {
      console.error('ensureLocationTrackingReadinessOnEntry', e);
      this.common.presentToast('Could not complete location permission setup.', 'warning');
    }
  }

  private async showLocationAlwaysInstructionModal(): Promise<boolean> {
    const msg = this.platform.is('ios')
      ? 'For concierge GPS trips, Location must be set to "Always".\n\nTap "Go to Settings", then choose Always for this app.'
      : 'For background GPS tracking, you must allow location "All the time" (not only while using the app).\n\nTap "Go to Settings" and select Allow all the time.';
    const alert = await this.alertController.create({
      header: 'Location access',
      message: msg,
      mode: this.platform.is('ios') ? 'ios' : 'md',
      buttons: [
        { text: 'Not now', role: 'cancel' },
        { text: 'Go to Settings', role: 'confirm' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role === 'confirm';
  }

  private async ensureBatteryOptimizationIgnored(): Promise<void> {
    const { allowed } = await LocationTracker.requestIgnoreBatteryOptimizationsCheck();
    if (allowed) {
      return;
    }
    const alert = await this.alertController.create({
      header: 'Battery Optimization',
      message: 'To ensure GPS tracking works continuously in the background, please disable battery optimization for this app.\n\nTap "Go to Settings" and select "Don\'t optimize".',
      mode: 'md',
      buttons: [
        { text: 'Not now', role: 'cancel' },
        { text: 'Go to Settings', role: 'confirm' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (role === 'confirm') {
      await LocationTracker.requestIgnoreBatteryOptimizations();
    }
  }

  private async checkBackgroundPermission() {
    const { allowed } = await LocationTracker.requestBackgroundPermissionsCheck();
    return allowed;
  }

  async openTripLogs(dat: any) {
    const modal = await this.modalCtrl.create({
      component: TripLogsComponent,
      cssClass: 'my-modal_',
      componentProps: {
        data: dat.id
      }
    });
    modal.present();
  }

}
