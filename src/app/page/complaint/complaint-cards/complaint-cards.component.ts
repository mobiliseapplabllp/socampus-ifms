import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ModalController, NavController } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { ComplaintService } from 'src/app/provider/complaint/complaint.service';
import { environment } from 'src/environments/environment';
import { SiteDetailComponent } from '../site-detail/site-detail.component';
import { TicketHistoryComponent } from '../ticket-history/ticket-history.component';
import { TicketTypeComponent } from '../ticket-type/ticket-type.component';
import { AssignTicketComponent } from '../assign-ticket/assign-ticket.component';
import { TravelDetailComponent } from '../travel-detail/travel-detail.component';
import { InstructionModalComponent } from '../instruction-modal/instruction-modal.component';
import { TripEndComponent } from '../trip-end/trip-end.component';
import { Geolocation } from '@capacitor/geolocation';
import { LiveTrackerService } from 'src/app/provider/live-tracker/live-tracker.service';
@Component({
  selector: 'app-complaint-cards',
  templateUrl: './complaint-cards.component.html',
  styleUrls: ['./complaint-cards.component.scss'],
})
export class ComplaintCardsComponent  implements OnInit {
  @Input() data: any;
  @Input() ticketType: any;
  @Output() greetEvent = new EventEmitter();
  paramsData: any = {
    id: 1,
    pagename: 'Create Indent',
    hide: false,
    disabl: true,
  };
  userData: any = [];
  loading: any;

  /** TESTING: hardcoded Start/End Trip - production build me nahi dikhte */
  readonly showTripTest = !environment.isProd;
  tripBusy = false;

  constructor(
    private modalCtrl: ModalController,
    private httpComplaint: ComplaintService,
    private common: CommonService,
    private router: Router,
    private alertController: AlertController,
    private navCtrl: NavController,
    private liveTracker: LiveTrackerService
  ) {

  }

  ngOnInit() {
  }

  isHidden(data: any) {
    data.hide = !data.hide;
  }

  check() {
  }

  async openSite() {
    const modal = await this.modalCtrl.create({
      component: SiteDetailComponent,
      cssClass: 'my-modal2',
      componentProps: { ticketData: this.data }
    });
    modal.present();
  }

  async history() {
    const modal = await this.modalCtrl.create({
      component: TicketHistoryComponent,
      cssClass: 'my-modal',
      componentProps: { ticket_id: this.data.tkts_id }
    });
    modal.present();
  }

  async work_now() {    
    this.common.presentLoading().then(preLoad => {
      this.httpComplaint.getSpecificTicket(this.data.tkts_id).subscribe({
        next:(data) => {
          if (data.status) {            
            if (data.data.complaint_type_cfrm === 0 && data.data.canDoTktConfirmationWork) {
              this.openTicketTypeModal(data);
            } else if (data.data?.pc_hse_conf.travel_allow === 1 && !data.data?.pc_hse_conf.travel_data && data.data.canWork) {
              this.travelModal();
            } else if (data.data.canWork){
              this.openTicketWork(data);
            } else {
              this.common.presentToast(`You can't work on this Ticket`, 'warning');
              return
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
          this.common.dismissloading();
        }
      });
    });
  }

  async openTicketTypeModal(data: any) {
    this.router.navigate(['complaint/ticket-type'], {
      queryParams: {
        data: JSON.stringify(data),
      }
    });
  }

  openTicketWork(data: any) {
    this.router.navigate(['complaint/ticket-work'], {
      queryParams: {
        data: JSON.stringify(data),
      }
    });
  }

  fsr(efsr: any) {
    this.common.presentLoading().then(preLoad => {
      this.httpComplaint.getEfsr(efsr).subscribe({
        next:(data) => {
          if (data.status) {
            let spareCount = data.data.reqIndent.length;
            this.downLoadEfsr(data.data, parseInt(spareCount, 10) + 1);
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

  downLoadEfsr(data: any, spareCount: number) {
    this.common.presentLoading().then(preLoad => {
      this.httpComplaint.downLoadEfsrPdf(data, spareCount).subscribe({
        next:(data) => {
          this.common.dismissloading();
          if (data.status) {
            this.common.openImg(data.data.url, data.data.blob_type)
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
      })
    })
  }

  async presentAlertConfirm(tkts_id: any) {
    const alert = await this.alertController.create({
      cssClass: 'my-custom-class',
      header: 'Re-Open Ticket ?',
      message: 'Are you Sure Want to Re-Open Ticket No ' + tkts_id,
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
          handler: (data) => {
            if(data.remark){
              const obj = {
                tktId : tkts_id,
                reopenRemark: data.remark,
                source: environment.source
              }
              this.reOpenTicket(obj);
            } else {
              this.errMsg('Please Enter Remark');
            }
          }
        }]
    });
    await alert.present();
  }

  errMsg(msg: string) {
    alert(msg)
  }

  reOpenTicket(data: any) {
    this.common.presentLoading().then(preLoad => {
      this.httpComplaint.reOpenTicket(data).subscribe({
        next:(data: any) => {
          if (data.status) {
            this.common.presentToast(data.msg, 'success');
            this.navCtrl.pop();
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

  indent() {
    this.paramsData.ticket_id = this.data.ticket_id;
    this.router.navigate(['create-indent'], {
      queryParams: {
        data: JSON.stringify(this.paramsData),
      }
    });
  }

  async assignTicket(ticket_id: any,  data: any) {
    const modal = await this.modalCtrl.create({
      component: AssignTicketComponent,
      cssClass: 'my-modal',
      componentProps: {
        ticket_id: ticket_id,
        allData: data
      }
    });
    modal.onWillDismiss().then(async disModal => {
      if (disModal.role) {
        this.greetEvent.emit(true);
      }
    });
    modal.present();
  }

  async travelModal() {
    const modal = await this.modalCtrl.create({
      component: TravelDetailComponent,
      cssClass: 'my-modal2',
      componentProps: {
        tkts_id: this.data.tkts_id
      }
    });
    modal.onWillDismiss().then(async disModal => {
      if (disModal.role) {
        // this.greetEvent.emit(true);
      }
    });
    modal.present();
  }

  async openInstructionModal() {
    const modal = await this.modalCtrl.create({
      component: InstructionModalComponent,
      cssClass: 'my-modal',
      backdropDismiss:false,
      componentProps: { }
    });
    modal.onWillDismiss().then(disModal => {
      if (disModal.role == 'true') {

      }
    });
    modal.present();
  }



  // ------------------------------------------------------ trip (TESTING)
  // Server ki condition aur start/end API abhi ready nahi - isliye hardcoded button.
  // Nayi tracking start nahi hoti: home page wali tracking hi har fix is ticket ke
  // against trip_points me bhi likhne lagti hai.

  /** Is ticket ki trip abhi chal rahi hai? (localStorage - turant jawab) */
  get isThisTripActive(): boolean {
    const t = this.liveTracker.getLocalTrip();
    return !!t && t.module === 'complaint' && String(t.id) === String(this.data?.tkts_id);
  }

  async testStartTrip(): Promise<void> {
    if (this.tripBusy) {
      return;
    }
    const active = await this.liveTracker.syncActiveTrip();
    if (active) {
      const same = active.module === 'complaint' && String(active.id) === String(this.data.tkts_id);
      this.common.presentToast(
        same
          ? 'Trip is already running for this ticket'
          : `Another trip is active (${active.module} #${active.id}). End it first.`,
        'warning'
      );
      return;
    }

    this.tripBusy = true;
    await this.common.presentLoading('Getting current location...');
    try {
      // Start point = abhi ki location. Server ko bhi yahi jayegi (API ready hone par),
      // aur trip_points ka pehla point bhi yahi banta hai
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 20000 });
      await this.liveTracker.startTrip('complaint', this.data.tkts_id, {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy || 0
      });
      this.common.presentToast('Trip started', 'success');
    } catch (e: any) {
      console.error('startTrip', e);
      this.common.presentToast(e?.message || 'Could not start the trip', 'warning');
    } finally {
      this.common.dismissloading();
      this.tripBusy = false;
    }
  }

  async testEndTrip(): Promise<void> {
    if (this.tripBusy) {
      return;
    }
    const active = await this.liveTracker.syncActiveTrip();
    const same = !!active && active.module === 'complaint'
      && String(active.id) === String(this.data.tkts_id);
    if (!same) {
      this.common.presentToast('No active trip for this ticket', 'warning');
      return;
    }

    const modal = await this.modalCtrl.create({
      component: TripEndComponent,
      componentProps: {
        module: 'complaint',
        specificId: String(this.data.tkts_id)
      }
    });
    await modal.present();
  }
}
