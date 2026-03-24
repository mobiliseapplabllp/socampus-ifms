import { Component, OnInit } from '@angular/core';
import { AlertController, ModalController } from '@ionic/angular';
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
    private alertController: AlertController
  ) { }

  ngOnInit() {
    this.userData = JSON.parse(localStorage.getItem('user')!);   
  }

  async startTracking() {    
    // 1. Background permission check
    const { allowed: bgAllowed } = await LocationTracker.requestBackgroundPermissionsCheck();
    if (!bgAllowed) {
      await LocationTracker.requestBackgroundPermissions(); // Opens app settings
      return;
    }

    // 2. Battery optimization check (IMPORTANT - tracking band ho sakti hai otherwise)
    const { allowed: batteryAllowed } = await LocationTracker.requestIgnoreBatteryOptimizationsCheck();
    if (!batteryAllowed) {
      await LocationTracker.requestIgnoreBatteryOptimizations(); // Opens battery settings
      return;
    }

    // 3. Start tracking
    const { success } = await LocationTracker.start();
    if (success) {
      console.log('Tracking started');
    } else {
      console.error('Failed to start');
    }
  }

  async stopTracking() {
    const { success } = await LocationTracker.stop();
    if (success) {
      console.log('Tracking stopped');
    }
  }

  async getLocations() {
    const { locations } = await LocationTracker.getLocations();
    console.log('Locations:', locations);
    return locations;
  }

  async clearLocations() {
    await LocationTracker.clearLocations();
    console.log('Locations cleared');
  }

  ionViewDidEnter() {
    this.getTicketList();
  }

  getTicketList(ticketType?: string) {
    const obj: any = {
      page: 1,
      limit: 50,
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

  


}
