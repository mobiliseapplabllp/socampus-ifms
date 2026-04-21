import { Component, OnInit } from '@angular/core';
import { AlertController, ModalController, Platform } from '@ionic/angular';
import { ConciergeService } from 'src/app/provider/concierge/concierge.service';
import { SiteComponent } from './site/site.component';
import { ConcHistoryComponent } from './conc-history/conc-history.component';
import { ActivatedRoute, Router } from '@angular/router';
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
  ticketData: any = [];
  userData: any = [];
  labelName: {[key: string]: string} = {
    request_raise_byme: 'Created By',
    assignto: 'Assigned To',
    all_active_req: 'All Request',
    completed: 'Completed'
  };
  page = 1;
  canLoadMore = false;
  showFilter = false;
  fromDate = '';
  toDate = '';
  statusFilter: number | '' = '';
  tatBreachFilter: string = '';
  tatBreachOptions = [
    { value: 'overall', label: 'Overall' },
    { value: 'response', label: 'Response' },
    { value: 'resolve', label: 'Resolve' },
  ];
  statusOptionsMap: { [key: string]: { value: number; label: string }[] } = {
    request_raise_byme: [
      { value: 2, label: 'Assigned' },
      { value: 3, label: 'In Progress' },
      { value: 4, label: 'Resolved' },
      { value: 6, label: 'Closed' },
      { value: 5, label: 'Reopen' },
    ],
    assignto: [
      { value: 2, label: 'Assigned' },
      { value: 3, label: 'In Progress' },
      { value: 5, label: 'Reopen' },
    ],
    all_active_req: [
      { value: 2, label: 'Assigned' },
      { value: 3, label: 'In Progress' },
      { value: 5, label: 'Reopen' },
    ],
    completed: [
      { value: 4, label: 'Resolved' },
      { value: 6, label: 'Closed' },
    ],
  };
  constructor(
    private httpConcierge: ConciergeService,
    private modalCtrl: ModalController,
    private router: Router,
    private route: ActivatedRoute,
    private common: CommonService,
    private alertController: AlertController,
    private platform: Platform
  ) { }

  ngOnInit() {
    this.userData = JSON.parse(localStorage.getItem('user')!);
    this.route.queryParams.subscribe(params => {
      if (params['status']) {
        this.status = params['status'];        
        this.getTicketList(this.status, this.page);
      }
    });
  }

  ionViewDidEnter() {
    if (this.platform.is('capacitor')) {
      void this.ensureLocationTrackingReadinessOnEntry();
    }
    // this.getTicketList();
  }

  getTicketList(ticketType: string, page: number, event?: any) {
    const obj: any = {
      page: page,
      limit: 10,
      export: 0,
      search: "",
      ticketType: ticketType,
      source: environment.source
    }
    if (this.statusFilter !== '' && this.statusFilter !== null && this.statusFilter !== undefined) {
      obj.status = [this.statusFilter];
    } else if (this.status === 'request_raise_byme') {
      obj.status = [1,2,3,4,5,6]
    } else if (this.status === 'assignto') {
      obj.status = [1,2,3,5]
    } else if (this.status === 'completed' ) {
      obj.status = [4,6];
    } else if (this.status === 'all_active_req') {
      obj.status = [1,2,3,5]
    }
    if (this.fromDate) {
      obj.from_date = this.fromDate;
    }
    if (this.toDate) {
      obj.to_date = this.toDate;
    }
    if (this.tatBreachFilter && (this.status === 'assignto' || this.status === 'all_active_req')) {
      obj.tat_breached = this.tatBreachFilter;
    }
    this.common.presentLoading().then(preLoad => {
      this.httpConcierge.getTicketList(obj).subscribe({
        next:(data: any) => {
          if (data.status) {            
            this.ticketData = [...this.ticketData ,...data.data.data];  
            if (this.page < data.data.last_page) {
              this.page = this.page + 1;
              this.canLoadMore = true;
            } else {
              this.canLoadMore = false;
            }
          } else {
            this.common.presentToast(data.msg, 'warning');
          }
        },
        error:() => {
          this.common.dismissloading();
          this.common.presentToast(environment.errMsg, 'danger');
        },
        complete:() => {
          if (event) {
            event.target.complete();
          }
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
      backdropDismiss: false,
      componentProps: {
        id: data.id,
        ext_id: data.ext_id,
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
        ext_id: data.ext_id,
        assign_to: data.assign_to,
        tab: this.status
      }
    });

    modal.onWillDismiss().then(async disModal => {
      if (disModal.role) {
        // this.getTicketList(this.status);
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
    // this.dashboard = {};
    this.ticketData = [];
    this.status = event.detail.value;
    // this.getTicketList(this.status);
  }

  createTicket() {
    this.router.navigateByUrl('/concierge/cr-ticket');
  }

  getStatusClass(stageDesc: string): string {
    const s = (stageDesc || '').toLowerCase();
    if (s === 'open') return 'status-open';
    if (s === 'assigned') return 'status-assigned';
    if (s === 'in progress') return 'status-in-progress';
    if (s === 'resolved') return 'status-resolved';
    if (s === 'closed') return 'status-closed';
    if (s === 'reopened' || s === 're-opened') return 'status-reopened';
    return 'status-open';
  }

  toggleFilter() {
    this.showFilter = !this.showFilter;
  }

  getStatusOptions(): { value: number; label: string }[] {
    return this.statusOptionsMap[this.status] || [];
  }

  applyFilter() {
    if (this.fromDate && this.toDate && this.fromDate > this.toDate) {
      this.common.presentToast('From Date cannot be after To Date', 'warning');
      return;
    }
    this.page = 1;
    this.ticketData = [];
    this.showFilter = false;
    this.getTicketList(this.status, this.page);
  }

  clearFilter() {
    if (!this.fromDate && !this.toDate && this.statusFilter === '' && !this.tatBreachFilter) {
      return;
    }
    this.fromDate = '';
    this.toDate = '';
    this.statusFilter = '';
    this.tatBreachFilter = '';
    this.page = 1;
    this.ticketData = [];
    this.getTicketList(this.status, this.page);
  }

  isPastDate(value: any): boolean {
    if (!value) {
      return false;
    }
    const t = new Date(String(value).replace(' ', 'T')).getTime();
    return Number.isFinite(t) && t < Date.now();
  }

  getStatusBorderColor(stageDesc: string): string {
    const s = (stageDesc || '').toLowerCase();
    if (s === 'open' || s === 'assigned') return '#e67e00';
    if (s === 'in progress') return '#43a047';
    if (s === 'resolved' || s === 'closed') return '#2e7d32';
    if (s === 'reopened' || s === 're-opened') return '#d32f2f';
    return '#e67e00';
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
            // this.dashboard = {};
            this.ticketData = [];
            this.common.presentToast(data.msg, 'success');
            // this.getTicketList(this.status);
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
        data: dat.id,
        ext_id: dat.ext_id
      }
    });
    modal.present();
  }

  loadData(event: any) {
    // event.target.complete();
    this.getTicketList(this.status, this.page, event);
  }

}
