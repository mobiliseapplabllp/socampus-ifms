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
import { TripStartComponent } from '../trip-start/trip-start.component';
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

  tripBusy = false;

  // ---------------------------------------------------------- trip buttons
  // Sab kuch server ke hisaab se: har ticket ke saath gps_mobile_allow aur
  // gps_mobile_trip { state, button_text, trip_id } aata hai.

  /** Is ticket par trip ho sakti hai */
  private get tripAllowed(): boolean {
    return Number(this.data?.gps_mobile_allow) === 1;
  }

  private get tripState(): string {
    return this.data?.gps_mobile_trip?.state || 'none';
  }

  /** Button ka text bhi server se - app apni taraf se naam nahi rakhti */
  get tripButtonText(): string {
    return this.data?.gps_mobile_trip?.button_text || '';
  }

  get showStartTrip(): boolean {
    return this.tripAllowed && this.tripState === 'none';
  }

  get showEndTrip(): boolean {
    return this.tripAllowed && this.tripState === 'running';
  }

  /** Trip ka koi button na bane, tabhi Work Now - aur uski apni purani shart bhi */
  get showWorkNow(): boolean {
    if (this.showStartTrip || this.showEndTrip) {
      return false;
    }
    return (this.data?.canWork || this.data?.canDoTktConfirmationWork)
      && !(this.data?.stage_id === 4 || this.data?.stage_id === 6);
  }
  /** Lamba remark 2 line me kata rehta hai - "more" par khulta hai */
  remarkOpen = false;

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

  /** Sheet - neeche se uthta hai, jitna content utni hi jagah leta hai */
  async openSite() {
    const modal = await this.modalCtrl.create({
      component: SiteDetailComponent,
      cssClass: 'app-sheet-modal',
      breakpoints: [0, 0.75, 1],
      initialBreakpoint: 0.75,
      handle: true,
      componentProps: { ticketData: this.data }
    });
    modal.present();
  }

  async history() {
    const modal = await this.modalCtrl.create({
      component: TicketHistoryComponent,
      cssClass: 'app-sheet-modal',
      breakpoints: [0, 0.9, 1],
      initialBreakpoint: 0.9,
      handle: true,
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
    // Tracking band hai to form kholna hi bekaar hai - warna engineer poora form
    // bhar ke, server par trip banwa ke, aakhir me "punch in karo" padhta
    if (this.liveTracker.isSupported()) {
      const status = await this.liveTracker.checkStatus();
      if (!status.running) {
        this.common.presentToast(
          'Please punch in from the side menu before starting a trip', 'warning');
        return;
      }
    }

    const active = await this.liveTracker.activeTrip();
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

    // Do baar tap = do modal aur do API call - isliye jab tak modal khula hai tab tak band
    this.tripBusy = true;
    // Form modal hi API par trip banata hai aur uske success par tracking chalu karta hai
    const modal = await this.modalCtrl.create({
      component: TripStartComponent,
      componentProps: {
        module: 'complaint',
        tktId: String(this.data.tkts_id)
      }
    });
    await modal.present();
    void modal.onDidDismiss().then((res) => {
      this.tripBusy = false;
      // Trip bani to card ka gps_mobile_trip purana ho gaya - list server se dobara
      if (res?.data?.started) {
        this.common.setHomeLoadStatus(true);
        this.greetEvent.emit(true);
      }
    });
  }

  async testEndTrip(): Promise<void> {
    // Seedha modal - active trip ki jaanch modal khud aur native karte hain
    const modal = await this.modalCtrl.create({
      component: TripEndComponent,
      componentProps: {
        module: 'complaint',
        specificId: String(this.data.tkts_id),
        // Server ki trip id sabse pakki - localStorage sirf backup hai
        serverTripId: this.data?.gps_mobile_trip?.trip_id != null
          ? String(this.data.gps_mobile_trip.trip_id) : ''
      }
    });
    await modal.present();
    void modal.onDidDismiss().then((res) => {
      if (res?.data?.ended) {
        this.common.setHomeLoadStatus(true);
        this.greetEvent.emit(true);
      }
    });
  }
}
