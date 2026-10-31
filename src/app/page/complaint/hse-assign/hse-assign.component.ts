import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { ComplaintService } from 'src/app/provider/complaint/complaint.service';
import { environment } from 'src/environments/environment';
import * as moment from 'moment';

/**
 * Ticket Type page ka "Assign To" / "Buddy" chooser. Sirf chunta hai aur item wapas
 * deta hai - assign API yahan nahi chalti, wo complaintTypeConfirm ke saath jaati hai.
 *
 * Do list:
 *  - GPS wali (pc_hse_conf.gps_mobile_allow = 1, assign aur buddy dono): gps-mobile/assign-list
 *    se, live tracking ke hisaab se distance / last seen / online. Card UI wahi jo
 *    ticket card ke Assign modal (assign-ticket) me hai.
 *  - Purani (gps_mobile_allow na ho): get_site_team_members, pehle jaisi.
 */
@Component({
  selector: 'app-hse-assign',
  templateUrl: './hse-assign.component.html',
  styleUrls: ['./hse-assign.component.scss'],
})
export class HseAssignComponent  implements OnInit {
  assignUser: any = [];
  assignUserCopy: any = [];
  pc_hse_conf: any;
  loading: any;
  allData: any = [];
  isAscending!: boolean;
  val!: string;
  assignTo: any;

  // ---------------------------------------------------------- gps assign
  gpsList: any = [];
  gpsListCopy: any = [];
  /** Site ke lat/lng set hain ya nahi - na hon to list dikhti hai par chunna band */
  siteHasCoords = true;
  /** Itne purane fix ka distance bharosemand nahi - halka dikhate hain */
  private readonly STALE_AFTER_MIN = 60;

  constructor(
    private modal: ModalController,
    private httpCommon: CommonService,
    private httpComplaint: ComplaintService
  ) { }

  /** GPS wali list - assign ho ya buddy, site par gps_mobile_allow ho to yahi chalti hai */
  get isGpsAssign(): boolean {
    return Number(this.pc_hse_conf?.gps_mobile_allow) === 1;
  }

  ngOnInit() {
    if (this.isGpsAssign) {
      this.getGpsAssignList();
    } else {
      this.getAssignMember();
    }
  }

  close(data: any, status: any) {
    if (status && this.isGpsAssign && !this.canAssign(data)) {
      this.httpCommon.presentToast(this.assignBlockReason(data), 'warning');
      return;
    }
    if (status && !this.isGpsAssign
        && data.gpsData?.can_assign !== 1 && this.pc_hse_conf?.gps_allow === 1) {
      this.httpCommon.presentToast('This User Currently Offline', 'warning');
      return;
    }
    this.modal.dismiss(data, status);
  }

  /** GPS wali list - ticket ke hisaab se, distance aur last seen ke saath */
  getGpsAssignList() {
    this.httpCommon.presentLoading().then(preLoad => {
      this.httpComplaint.getAssignList(this.allData?.tkts_id).subscribe({
        next:(data) => {
          if (data.status) {
            // Server ka order hi final - paas wale aur online pehle aate hain
            let list = data.data || [];
            // Buddy chunte waqt jo assign ho chuka hai wo list me nahi (legacy jaisa hi)
            if (this.val === 'buddy' && this.assignTo) {
              list = list.filter((item: any) => item.value != this.assignTo);
            }
            this.gpsList = list;
            this.gpsListCopy = list;
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

  /** Purani list - pehle jaisi, isme kuch nahi badla */
  getAssignMember() {
    let with_gps = 0;
    // if (this.val === 'buddy') {
    //   with_gps = 0
    // } else {
    //   with_gps = this.pc_hse_conf?.gps_allow
    // }
    this.httpCommon.presentLoading().then(preLoad => {
      this.httpComplaint.getTeam(this.allData.pc_id, with_gps).subscribe({
        next:(data) => {
          if (data.status) {
            this.assignUser = data.data;
            this.assignUserCopy = data.data;
            if (this.val === 'buddy') {
              this.assignUser = this.assignUser.filter((val: any) => val.value != this.assignTo);
              this.assignUserCopy = this.assignUserCopy.filter((val: any) => val.value != this.assignTo);
            }
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
      })
    })
  }

  sortArr() {
    if (!this.isAscending) {
      this.assignUser.sort((a: any, b: any) => a.distance - b.distance);
    } else {
      this.assignUser.sort((a: any, b: any) => b.distance - a.distance);
    }
    this.isAscending = !this.isAscending;
  }

  search(ev: any) {
    let val: any;
    val = ev.target.value;
    if (this.isGpsAssign) {
      this.gpsList = this.filterByLabel(this.gpsListCopy, val);
      return;
    }
    this.assignUser = this.filterByLabel(this.assignUserCopy, val);
  }

  private filterByLabel(list: any[], val: string): any[] {
    if (!val || val.trim() === '') {
      return list;
    }
    const q = val.toLowerCase();
    return (list || []).filter((dat: any) => (dat?.label || '').toLowerCase().indexOf(q) > -1);
  }

  // ------------------------------------------------- gps card helpers
  // Wahi hisaab jo assign-ticket me hai, taaki dono jagah card ek jaisa dikhe

  trackByUser(_: number, item: any) {
    return item?.user_id ?? item?.value;
  }

  /** Chun tabhi sakte hain jab site ke coords hon aur banda online ho */
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
}
