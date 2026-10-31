import { Component, OnInit } from '@angular/core';
import { AlertController, ModalController } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { ComplaintService } from 'src/app/provider/complaint/complaint.service';
import { environment } from 'src/environments/environment';
import * as moment from 'moment';
@Component({
  selector: 'app-assign-ticket',
  templateUrl: './assign-ticket.component.html',
  styleUrls: ['./assign-ticket.component.scss'],
})
export class AssignTicketComponent  implements OnInit {
  ticket_id: any;
  empList: any = [];
  empListCopy: any = [];
  emp: any = [];
  loading: any;
  userData: any = [];
  loaidng:any;
  allData: any = [];

  // ---------------------------------------------------------- gps assign
  // Do alag list, do alag template. Purani wali ko chhua nahi - jin tickets me
  // GPS allow nahi hai wo bilkul pehle jaise chalte rahein.
  gpsList: any = [];
  gpsListCopy: any = [];
  /** Site ke lat/lng set hain ya nahi - na hon to list dikhti hai par assign band */
  siteHasCoords = true;
  /** Itne purane fix ka distance bharosemand nahi - halka dikhate hain */
  private readonly STALE_AFTER_MIN = 60;

  /** Ticket par GPS wali assign chalegi ya purani */
  get isGpsAssign(): boolean {
    return Number(this.allData?.gps_mobile_allow) === 1;
  }
  constructor(
    private modalCtrl: ModalController,
    private httpCommon: CommonService,
    private httpComplaint: ComplaintService,
    private alertController: AlertController,
  ) { }

  ngOnInit() {
    if (this.isGpsAssign) {      
      this.getGpsAssignList();
    } else { 
      this.getTeamsMember();
    }
  }

  /** GPS wali list - ticket ke hisaab se, distance aur last seen ke saath */
  getGpsAssignList() {
    this.httpCommon.presentLoading().then(preLoad => {
      this.httpComplaint.getAssignList(this.ticket_id).subscribe({
        next:(data) => {
          if (data.status) {
            // Server ka order hi final - paas wale aur online pehle aate hain
            this.gpsList = data.data || [];
            this.gpsListCopy = this.gpsList;
            this.siteHasCoords = data.site_has_coords !== false;
          } else {
            this.httpCommon.presentToast(data.msg || 'Unable to load the team list', 'warning');
          }
        },
        error:() => {
          this.httpCommon.dismissloading();
          this.httpCommon.presentToast(environment.errMsg, 'danger');
        },
        complete:() => {
          this.httpCommon.dismissloading();
        }
      });
    });
  }

  trackByUser(_: number, item: any) {
    return item?.user_id ?? item?.value;
  }

  /** Assign tabhi ho sakta hai jab site ke coords hon aur banda online ho */
  canAssign(item: any): boolean {
    return this.siteHasCoords && Number(item?.is_online) === 1;
  }

  /** Button band hone ki wajah - row me hi dikhti hai (disabled button tap nahi hota) */
  assignBlockReason(item: any): string {
    if (!this.siteHasCoords) {
      return 'Site coordinates not available';
    }
    if (Number(item?.is_online) !== 1) {
      return 'Offline';
    }
    return '';
  }

  /** "Tracking_4-Mahavir Singh" -> "Mahavir Singh" (naam me hyphen ho to sirf pehla toda) */
  nameOf(label: string): string {
    const i = (label || '').indexOf('-');
    return i > -1 ? label.substring(i + 1).trim() : (label || '');
  }

  /** Wahi label ka pehla hissa - login code */
  codeOf(label: string): string {
    const i = (label || '').indexOf('-');
    return i > -1 ? label.substring(0, i).trim() : '';
  }

  initials(label: string): string {
    const parts = this.nameOf(label).split(/\s+/).filter(Boolean);
    if (!parts.length) {
      return 'U';
    }
    const first = parts[0][0];
    const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + last).toUpperCase();
  }

  /** 1 km se kam ho to metre me - "0 km" dikhane ka koi matlab nahi */
  distanceText(item: any): string {
    if (!this.siteHasCoords) {
      return 'Distance unavailable';
    }
    const m = Number(item?.distance_in_m);
    if (item?.distance_in_m === null || item?.distance_in_m === undefined || !isFinite(m)) {
      return 'Location not available';
    }
    return m < 1000 ? `${Math.round(m)} m away` : `${(m / 1000).toFixed(1)} km away`;
  }

  /** "2 min ago" / "3 days ago" - kitna purana fix hai wo saaf dikhna chahiye */
  lastSeenText(item: any): string {
    if (!item?.last_seen) {
      return 'Never seen';
    }
    const at = moment(item.last_seen, 'YYYY-MM-DD HH:mm:ss');
    return at.isValid() ? at.fromNow() : 'Never seen';
  }

  /** Purana fix = distance halka, taaki uspar aankh band karke bharosa na ho */
  isStale(item: any): boolean {
    if (!item?.last_seen) {
      return true;
    }
    const at = moment(item.last_seen, 'YYYY-MM-DD HH:mm:ss');
    return !at.isValid() || moment().diff(at, 'minutes') > this.STALE_AFTER_MIN;
  }

  close(data: any, status: any) {
    this.modalCtrl.dismiss(data, status);
  }

  getTeamsMember() {
    this.httpCommon.presentLoading().then(preLoad => {
      this.httpComplaint.getTeam(this.allData.pc_id, 0).subscribe({
        next:(data) => {
          if (data.status) {
            this.empList = data.data;
            this.empListCopy = data.data;
          } else {
            this.httpCommon.presentToast(data.msg, 'warning');
          }
        },
        error:() => {
          this.httpCommon.dismissloading();
          this.httpCommon.presentToast(environment.errMsg, 'danger');
        },
        complete:() => {
          this.httpCommon.dismissloading();
        }
      });
    })

  }

  search(ev: any) {
    const val: string = ev.target.value;
    // Dono list ka label ek jaisa hai, isliye filter ek hi - bas array alag
    if (this.isGpsAssign) {
      this.gpsList = this.filterByLabel(this.gpsListCopy, val);
      return;
    }
    this.empList = this.filterByLabel(this.empListCopy, val);
  }

  private filterByLabel(list: any[], val: string): any[] {
    if (!val || val.trim() === '') {
      return list;
    }
    const q = val.toLowerCase();
    return (list || []).filter((dat: any) => (dat?.label || '').toLowerCase().indexOf(q) > -1);
  }

  /**
   * Galat naam par tap ho jaana aam hai aur assign server par turant chala jaata hai,
   * isliye pehle ek confirm. Distance/last seen bhi yahin dikha dete hain.
   */
  async confirmAssign(item: any) {
    if (this.isGpsAssign && !this.canAssign(item)) {
      return;
    }
    const name = this.nameOf(item?.label) || 'this user';
    const detail = this.isGpsAssign
      ? `${this.distanceText(item)} \u00b7 last seen ${this.lastSeenText(item)}`
      : '';
    const alert = await this.alertController.create({
      header: 'Assign ticket',
      message: `Assign ticket #${this.ticket_id} to ${name}?` + (detail ? `<br><small>${detail}</small>` : ''),
      mode: 'ios',
      buttons: [
        { text: 'Cancel', role: 'cancel', cssClass: 'alert-light-btn' },
        { text: 'Assign', cssClass: 'alert-bold-btn', handler: () => this.assign(item) }
      ]
    });
    await alert.present();
  }

  assign(data: any) {
    // Payload purane jaisa hi - dono API me value aur team_id same aate hain
    if (this.isGpsAssign && !this.canAssign(data)) {
      return;
    }
    const obj = {
      source: environment.source,
      team: data.value + '-' + data.team_id,
      ticketId: this.ticket_id
    }
    this.httpCommon.presentLoading().then(preLoad => {
      this.httpComplaint.assignedTicket(obj).subscribe({
        next:(data) => {
          if (data.status) {
            this.httpCommon.presentToast(data.msg, 'success');
            this.httpCommon.setHomeLoadStatus(true);
            this.close(null, true);
          } else {
            this.httpCommon.presentToast(data.msg, 'warning');
          }
        },
        error:() => {
          this.httpCommon.dismissloading();
          this.httpCommon.presentToast(environment.errMsg, 'danger');
        },
        complete:() => {
          this.httpCommon.dismissloading();
        }
      });
    });
  }
}
