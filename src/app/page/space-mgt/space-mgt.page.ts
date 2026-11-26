import { Component, OnInit } from '@angular/core';
import { CommonService } from 'src/app/provider/common/common.service';
import { SpaceMgtService } from 'src/app/provider/space-mgt/space-mgt.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-space-mgt',
  templateUrl: './space-mgt.page.html',
  styleUrls: ['./space-mgt.page.scss'],
})
export class SpaceMgtPage implements OnInit {

  // SSO ke time jo FMS user save hua tha, usse tenant_id / organisation_id lete hain
  userData: any = {};
  tenant_id: any = '';
  organisation_id: any = '';

  // Site
  siteArr: any = [];
  site_id: any = '';
  site_name = '';

  // Facility
  facilityArr: any = [];
  isLoading = false;

  // Picker
  isPickerOpen = false;
  pickerArr: any = [];
  pickerArrCopy: any = [];

  // Facility detail (STEP 3)
  isDetailOpen = false;
  isDetailLoading = false;
  facility: any = {};
  menuArr: any = [];
  mealArr: any = [];

  // Booking (STEP 4)
  bookDate = '';
  minDate = '';
  maxDate = '';
  openTime = '';
  closeTime = '';
  slotMinutes = 30;
  slotArr: any = [];
  isSlotLoading = false;
  selectedSlot: any = null;
  capacity = 0;
  attendees = 1;
  title = '';
  remarks = '';
  isSubmit = false;
  isDateOpen = false;

  // Chair (layout_json se) + check api ka result
  chairArr: any = [];
  selectedDesks: any = [];
  guestArr: any = [];
  occupiedArr: any = [];
  seatsTaken = 0;
  seatsFree = 0;
  isChecking = false;

  // Booking confirm hone ke baad
  isDoneOpen = false;
  bookingId: any = '';

  constructor(
    private common: CommonService,
    private httpSpace: SpaceMgtService,
  ) { }

  ngOnInit() {
    const user = localStorage.getItem('fmsUser');
    if (user) {
      this.userData = JSON.parse(user);
    }
    this.tenant_id = this.userData.tenant_id;
    this.organisation_id = this.userData.organisation_id;
    this.getSites();
  }

  // ---------------- STEP 1 : Site list ----------------

  getSites() {
    this.common.presentLoading().then(preLoad => {
      this.httpSpace.getSites(this.tenant_id, this.organisation_id).subscribe({
        next: (data: any) => {
          this.siteArr = this.listOf(data);
        },
        error: () => {
          this.common.dismissloading();
          this.common.presentToast(environment.errMsg, 'danger');
        },
        complete: () => {
          this.common.dismissloading();
        }
      });
    });
  }

  // ---------------- STEP 2 : Facility list ----------------

  getFacilities() {
    this.isLoading = true;
    this.facilityArr = [];
    this.httpSpace.getFacilities(this.site_id, this.tenant_id, this.organisation_id).subscribe({
      next: (data: any) => {
        this.facilityArr = this.listOf(data);
      },
      error: () => {
        this.isLoading = false;
        this.common.presentToast(environment.errMsg, 'danger');
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  // ---------------- STEP 3 : Facility detail ----------------

  // Facility card par click — detail + slots + pantry ki api hit hoti hain
  openFacility(dat: any) {
    this.facility = dat;
    this.capacity = dat.capacity || 0;
    this.menuArr = [];
    this.mealArr = [];
    this.slotArr = [];
    this.chairArr = [];
    this.resetSlot();
    this.title = '';
    this.remarks = '';
    this.isSubmit = false;
    this.bookDate = this.today();
    this.minDate = this.today();
    this.maxDate = this.addDays(this.today(), 15);
    this.isDetailOpen = true;
    this.getFacilityDetail(dat.id);
    this.getDaySlots();
    this.getPantryMenu(dat.id);
    this.getMealTimes();
  }

  getFacilityDetail(facilityId: any) {
    this.isDetailLoading = true;
    this.httpSpace.getFacilityDetail(facilityId).subscribe({
      next: (data: any) => {
        const row = this.rowOf(data);
        this.facility = { ...this.facility, ...row };
        this.capacity = this.facility.capacity || 0;
        this.maxDate = this.addDays(this.today(), this.facility.max_advance_days || 15);
        this.setHours();
        this.setChairs();
      },
      error: () => {
        this.isDetailLoading = false;
        this.common.presentToast(environment.errMsg, 'danger');
      },
      complete: () => {
        this.isDetailLoading = false;
      }
    });
  }

  // ---------------- STEP 4 : Day slots ----------------

  // keep = true tab bhejte hain jab sirf attendees badle hain, slot wahi rakhna hai
  getDaySlots(keep: boolean = false) {
    const prev = keep && this.selectedSlot ? this.selectedSlot.start : '';
    this.isSlotLoading = true;
    this.slotArr = [];
    if (!keep) { this.resetSlot(); }
    this.httpSpace.getDaySlots(this.facility.id, this.bookDate, this.attendees).subscribe({
      next: (data: any) => {
        const row = this.rowOf(data);
        this.capacity = row.capacity || this.capacity;
        this.slotArr = (row.slots || []).map((dat: any) => this.buildSlot(dat));
        if (prev) { this.keepSlot(prev); }
      },
      error: () => {
        this.isSlotLoading = false;
        this.common.presentToast(environment.errMsg, 'danger');
      },
      complete: () => {
        this.isSlotLoading = false;
      }
    });
  }

  // Har slot par past / full / available ka status laga dete hain
  buildSlot(dat: any) {
    const past = this.isPast(dat.start);
    const full = Number(dat.seats_remaining) <= 0 || dat.conflict;
    return {
      ...dat,
      past: past,
      full: full,
      disable: past || full,
      note: past ? 'Past' : (full ? 'Full' : dat.seats_remaining + ' left')
    };
  }

  // min_advance_minutes ke baad wala slot hi book ho sakta hai
  isPast(start: string) {
    const time = (start || '').split(':');
    const slot = new Date(this.bookDate + 'T00:00:00');
    slot.setHours(Number(time[0]), Number(time[1]), 0, 0);
    const limit = new Date();
    limit.setMinutes(limit.getMinutes() + Number(this.facility.min_advance_minutes || 0));
    return slot.getTime() < limit.getTime();
  }

  selectSlot(dat: any) {
    if (dat.disable) { return; }
    this.selectedSlot = dat;
    this.selectedDesks = [];
    this.guestArr = [];
    this.checkBooking();
  }

  // Attendees badalne par wahi slot dobara select rakhte hain, na mile to clear
  keepSlot(start: string) {
    const row = this.slotArr.find((dat: any) => dat.start === start);
    if (row && !row.disable) {
      this.selectedSlot = row;
    } else {
      this.resetSlot();
      this.attendees = 1;
      this.common.presentToast('This slot is not available for selected chairs', 'warning');
    }
  }

  slotClass(dat: any) {
    if (dat.disable) { return 'sl-off'; }
    if (this.selectedSlot && this.selectedSlot.start === dat.start) { return 'sl-on'; }
    return 'sl-free';
  }

  resetSlot() {
    this.selectedSlot = null;
    this.selectedDesks = [];
    this.guestArr = [];
    this.occupiedArr = [];
    this.seatsTaken = 0;
    this.seatsFree = 0;
  }

  changeDate(ev: any) {
    const val = ev.detail.value;
    if (!val) { return; }
    this.bookDate = val.substring(0, 10);
    this.isDateOpen = false;
    this.setHours();
    this.getDaySlots();
  }

  // ---------------- Slot select par availability check ----------------

  checkBooking() {
    this.isChecking = true;
    this.httpSpace.checkBooking(this.facility.id, this.startAt(), this.endAt(), this.attendees).subscribe({
      next: (data: any) => {
        const row = this.rowOf(data);
        this.capacity = row.capacity || this.capacity;
        this.seatsTaken = row.seats_taken || 0;
        this.seatsFree = row.seats_remaining || 0;
        this.occupiedArr = row.occupied_desks || [];
        if (row.conflict) {
          this.common.presentToast(row.reason || 'This slot is not available', 'warning');
        }
      },
      error: () => {
        this.isChecking = false;
        this.common.presentToast(environment.errMsg, 'danger');
      },
      complete: () => {
        this.isChecking = false;
      }
    });
  }

  // ---------------- Chair ----------------

  // Chair ki list facility ke layout_json me aati hai
  setChairs() {
    this.chairArr = [];
    try {
      const layout = JSON.parse(this.facility.layout_json || '{}');
      this.chairArr = (layout.objects || []).filter((dat: any) => dat.type === 'chair');
    } catch (e) {
      this.chairArr = [];
    }
  }

  // Ek se zyada chair select ho sakti hain — pahli apni, baaki guest ki
  selectChair(dat: any) {
    if (this.isTaken(dat)) { return; }
    const i = this.selectedDesks.indexOf(dat.id);
    if (i > -1) {
      this.selectedDesks.splice(i, 1);
    } else {
      if (this.selectedDesks.length >= this.seatsFree) {
        this.common.presentToast('Only ' + this.seatsFree + ' chair(s) free in this slot', 'warning');
        return;
      }
      this.selectedDesks.push(dat.id);
    }
    this.setGuests();
    this.attendees = this.selectedDesks.length || 1;
    this.getDaySlots(true);
  }

  // Pahli chair ke alawa har chair ke liye ek guest row
  setGuests() {
    const old = this.guestArr;
    this.guestArr = this.selectedDesks.slice(1).map((id: any) => {
      const row = old.find((dat: any) => dat.desk_id === id);
      return row ? row : { desk_id: id, label: this.deskLabel(id), email: '', name: '' };
    });
  }

  isPicked(dat: any) {
    return this.selectedDesks.indexOf(dat.id) > -1;
  }

  isTaken(dat: any) {
    return this.occupiedArr.indexOf(dat.id) > -1;
  }

  chairClass(dat: any) {
    if (this.isTaken(dat)) { return 'ch-taken'; }
    if (this.isPicked(dat)) { return 'ch-pick'; }
    return 'ch-free';
  }

  deskLabel(id: any) {
    const row = this.chairArr.find((dat: any) => dat.id === id);
    return row ? (row.label || row.id) : id;
  }

  // Banner me sari picked chair ek saath — NEW-D01, NEW-D02
  deskLabels() {
    return this.selectedDesks.map((id: any) => this.deskLabel(id)).join(', ');
  }

  // ---------------- Confirm booking ----------------

  startAt() {
    return this.bookDate + ' ' + this.selectedSlot.start + ':00';
  }

  endAt() {
    return this.bookDate + ' ' + this.selectedSlot.end + ':00';
  }

  // Us din ke operating hours detail api ke operating_hours me se nikalte hain
  setHours() {
    const list = this.facility.operating_hours || [];
    const day = new Date(this.bookDate + 'T00:00:00').getDay();
    const row = list.find((dat: any) => Number(dat.day_of_week) === day);
    this.openTime = row ? this.hhmm(row.open_time) : '';
    this.closeTime = row ? this.hhmm(row.close_time) : '';
    this.slotMinutes = row ? row.slot_minutes : 30;
  }

  // Booking rules ki line (web par jaisi dikhti hai)
  rulesText() {
    const f = this.facility;
    const arr = [];
    if (f.min_advance_minutes) { arr.push('min ' + f.min_advance_minutes + ' min ahead'); }
    if (f.max_advance_days) { arr.push('up to ' + f.max_advance_days + ' day(s) ahead'); }
    if (f.max_per_user_per_day) { arr.push('max ' + f.max_per_user_per_day + '/day per user'); }
    if (f.max_per_user_per_week) { arr.push('max ' + f.max_per_user_per_week + '/week per user'); }
    if (f.max_per_user_per_month) { arr.push('max ' + f.max_per_user_per_month + '/month per user'); }
    return arr.join(' · ');
  }

  confirmBooking() {
    this.isSubmit = true;
    if (!this.selectedSlot) {
      this.common.presentToast('Please select a time slot', 'warning');
      return;
    }
    if (this.chairArr.length > 0 && this.selectedDesks.length === 0) {
      this.common.presentToast('Please pick your chair', 'warning');
      return;
    }
    if (!this.title || this.title.trim() === '') {
      return;
    }
    const blank = this.guestArr.find((dat: any) => !dat.email || dat.email.trim() === '');
    if (blank) {
      this.common.presentToast('Please fill guest email for ' + blank.label, 'warning');
      return;
    }

    const data = {
      facility_id: this.facility.id,
      desk_id: this.selectedDesks[0] || null,
      start_at: this.startAt(),
      end_at: this.endAt(),
      title: this.title,
      remarks: this.remarks,
      repeat_type: 'none',
      guests: this.guestArr.map((dat: any) => ({ desk_id: dat.desk_id, email: dat.email, name: dat.name })),
      meal_time_ids: [],
      pantry_orders: []
    };

    this.common.presentLoading().then(preLoad => {
      this.httpSpace.createBooking(data).subscribe({
        next: (res: any) => {
          if (res.status) {
            this.bookingId = res?.data?.id || '';
            this.isDoneOpen = true;
          } else {
            this.common.presentToast(res.msg, 'warning');
          }
        },
        error: () => {
          this.common.dismissloading();
          this.common.presentToast(environment.errMsg, 'danger');
        },
        complete: () => {
          this.common.dismissloading();
        }
      });
    });
  }

  // Booking ho gayi — naya form ya modal band
  newBooking() {
    this.isDoneOpen = false;
    this.title = '';
    this.remarks = '';
    this.isSubmit = false;
    this.getDaySlots();
  }

  closeDone() {
    this.isDoneOpen = false;
    this.closeDetail();
  }

  getPantryMenu(facilityId: any) {
    this.httpSpace.getPantryMenu(facilityId).subscribe({
      next: (data: any) => {
        this.menuArr = this.listOf(data);
      },
      error: () => { }
    });
  }

  getMealTimes() {
    this.httpSpace.getMealTimes().subscribe({
      next: (data: any) => {
        this.mealArr = this.listOf(data);
      },
      error: () => { }
    });
  }

  closeDetail() {
    this.isDetailOpen = false;
  }

  // ---------------- Site picker ----------------

  openPicker() {
    this.pickerArr = this.siteArr;
    this.pickerArrCopy = this.siteArr;
    this.isPickerOpen = true;
  }

  searchPicker(ev: any) {
    const val = ev.target.value;
    this.pickerArr = this.pickerArrCopy;
    if (val && val.trim() !== '') {
      this.pickerArr = this.pickerArrCopy.filter((dat: any) => {
        return this.nameOf(dat).toLowerCase().indexOf(val.toLowerCase()) > -1;
      });
    }
  }

  selectPicker(dat: any) {
    this.site_id = dat.id;
    this.site_name = this.nameOf(dat);
    this.closePicker();
    this.getFacilities();
  }

  closePicker() {
    this.isPickerOpen = false;
    this.pickerArr = this.pickerArrCopy;
  }

  // ---------------- Helper ----------------

  // Response me list kabhi data me aati hai kabhi data.data me — dono handle
  listOf(res: any) {
    if (Array.isArray(res)) { return res; }
    if (Array.isArray(res?.data)) { return res.data; }
    if (Array.isArray(res?.data?.data)) { return res.data.data; }
    return [];
  }

  // Detail api ka object kabhi data me aata hai kabhi seedha — dono handle
  rowOf(res: any) {
    if (res?.data && !Array.isArray(res.data)) { return res.data; }
    if (Array.isArray(res?.data) && res.data.length) { return res.data[0]; }
    return res || {};
  }

  nameOf(dat: any) {
    return (dat?.name || dat?.site_name || dat?.title || '') + '';
  }

  // 09:00:00 -> 09:00
  hhmm(time: any) {
    return (time || '').toString().substring(0, 5);
  }

  today() {
    return this.ymd(new Date());
  }

  addDays(date: string, days: number) {
    const dt = new Date(date + 'T00:00:00');
    dt.setDate(dt.getDate() + Number(days));
    return this.ymd(dt);
  }

  ymd(dt: Date) {
    const m = ('0' + (dt.getMonth() + 1)).slice(-2);
    const d = ('0' + dt.getDate()).slice(-2);
    return dt.getFullYear() + '-' + m + '-' + d;
  }

  handleRefresh(event: any) {
    event.target.complete();
    if (this.site_id) {
      this.getFacilities();
    } else {
      this.getSites();
    }
  }

}
