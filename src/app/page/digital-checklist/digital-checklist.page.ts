import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, IonDatetime, IonSlides, ModalController, Platform } from '@ionic/angular';
import * as moment from 'moment';
import { liveQuery, Subscription as DexieSubscription } from 'dexie';
import { CommonService } from 'src/app/provider/common/common.service';
import { DigitalChecklistService } from 'src/app/provider/digital-checklist/digital-checklist.service';
import { environment } from 'src/environments/environment';
import { db } from '../../provider/local-db/local-db.service';
import { JustificationComponent } from './justification/justification.component';

type SegmentStatus = 'assigned' | 'attended';
type QrFlow = 'site' | 'verify' | 'loc-verify';

interface CalendarDay {
  date: string;
  day: string;
  fulldate: string;
  ind: number;
  isSelect: boolean;
}

interface ScanState {
  isScanBarcode: boolean;
  QRType: string;
  QRValue: string;
}

interface Pagination {
  offset: number;
  total: number;
  hasMore: boolean;
}

const PAGE_SIZE = 300;
const OLD_DATA_RETENTION_DAYS = 3;

@Component({
  selector: 'app-digital-checklist',
  templateUrl: './digital-checklist.page.html',
  styleUrls: ['./digital-checklist.page.scss'],
})
export class DigitalChecklistPage implements OnInit, OnDestroy {
  @ViewChild(IonSlides) slides!: IonSlides;
  @ViewChild('popoverDatetime') popoverDatetime!: IonDatetime;

  segmentStatus: SegmentStatus = 'assigned';
  selectedDate = moment().format('YYYY-MM-DD');
  today = moment().format('YYYY-MM-DD');

  assignCheckList: any[] = [];
  attendedCheckList: any[] = [];
  dateArr: CalendarDay[] = [];

  isInternet = false;
  isOnBehalf = 0;
  userData: any = {};

  scanBarcodeDetail: ScanState = { isScanBarcode: false, QRType: '', QRValue: '' };
  qrType: QrFlow = 'site';
  qrObject: any = {};

  pagination: Pagination = { offset: 0, total: 0, hasMore: false };

  slideBanner = {
    initialSlide: 0,
    slidesPerView: 5,
    autoplay: false,
    breakpoints: {
      320: { slidesPerView: 5 },
      480: { slidesPerView: 6 },
      530: { slidesPerView: 7 },
      640: { slidesPerView: 8 },
      700: { slidesPerView: 9 },
    },
  };

  private activeDexieSubs: DexieSubscription[] = [];

  constructor(
    private common: CommonService,
    private router: Router,
    private httpDigital: DigitalChecklistService,
    private platform: Platform,
    private alertController: AlertController,
    private modalCtrl: ModalController,
  ) {}

  ngOnInit() {
    this.common.checkInternet().then(online => {
      this.isInternet = !!online;
    });
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      this.userData = JSON.parse(storedUser);
    }
    this.common.setBarcode('');
    const retentionCutoff = moment().subtract(OLD_DATA_RETENTION_DAYS, 'day').format('YYYY-MM-DD');
    this.pruneOldChecklists(retentionCutoff);
    this.buildCalendarStrip(this.selectedDate);
  }

  ngOnDestroy() {
    this.disposeDexieSubs();
  }

  ionViewDidLeave() {
    this.common.setBarcode('');
    this.common.dismissloading();
    this.disposeDexieSubs();
  }

  ionViewDidEnter() {
    const barcode = this.common.getBarcode();
    this.common.setBarcode('');

    if (!barcode && this.qrType === 'site') {
      if (this.scanBarcodeDetail.isScanBarcode) {
        this.loadChecklistByBarcode(this.scanBarcodeDetail.QRType, this.scanBarcodeDetail.QRValue);
      } else {
        this.loadChecklistForDate(this.selectedDate);
      }
      return;
    }

    this.handleScannedBarcode(barcode);
  }

  private handleScannedBarcode(barcode: string | null | undefined) {
    const parts = barcode?.split('/') || [];
    if (parts.length !== 6) {
      this.common.presentToast('You are Scan Wrong QR Code', 'warning');
      return;
    }

    const scannedType = parts[4];
    const decodedValue = this.common.decryptValue(parts[5]);

    switch (this.qrType) {
      case 'site':
        this.scanBarcodeDetail = { isScanBarcode: true, QRType: scannedType, QRValue: decodedValue };
        if (decodedValue) {
          this.loadChecklistByBarcode(scannedType, decodedValue);
        } else {
          this.common.presentToast('Invalid Encryption', 'warning');
        }
        break;

      case 'verify':
        this.qrType = 'site';
        if (this.qrObject.barcode === decodedValue) {
          this.navigateToFillReport(this.qrObject);
        } else {
          this.common.presentToast(`You are Scan Wrong QR Code ${decodedValue}`, 'warning');
        }
        break;

      case 'loc-verify':
        this.qrType = 'site';
        if (this.qrObject.loc_id === parseInt(decodedValue, 10)) {
          this.navigateToFillReport(this.qrObject);
        } else {
          this.common.presentToast(`You are Scan Wrong Location QR Code ${decodedValue}`, 'warning');
        }
        break;
    }
  }

  myCheckList() {
    this.scanBarcodeDetail = { isScanBarcode: false, QRType: '', QRValue: '' };
    this.loadChecklistForDate(this.selectedDate);
  }

  private loadChecklistByBarcode(type: string, value: string) {
    const todayDate = moment().format('YYYY-MM-DD');
    let filter: () => Promise<any[]>;

    if (type === 'complaint-qr-code') {
      filter = () => db.checklist.where({ loc_id: parseInt(value, 10), schedule_date: todayDate }).toArray();
    } else if (type === 'create-ticket-qr-code') {
      filter = () => db.checklist.where({ barcode: value, schedule_date: todayDate }).toArray();
    } else {
      return;
    }

    this.subscribeOnceToDexie(filter, data => {
      this.splitChecklistsForUser(data, /*sortAssigned*/ true);
    });
  }

  async presentAlertConfirm() {
    const alert = await this.alertController.create({
      cssClass: 'my-custom-class',
      header: 'REFRESH DIGITAL CHECKLIST?',
      message: 'are you sure want to Refresh Digital Checklist?',
      mode: 'ios',
      buttons: [
        { text: 'Cancel', handler: () => {} },
        { text: 'YES', handler: () => this.refreshIfNoOfflinePending() },
      ],
    });
    await alert.present();
  }

  private refreshIfNoOfflinePending() {
    this.subscribeOnceToDexie(
      () => db.checklist.where({ offline_save: 'true' }).toArray(),
      data => {
        if (data.length > 0) {
          this.common.presentToastWithOk(
            `Warning!!! You have ${data.length} Digital Checklist saved in your local Db Please Submit these checklist to server otherwise your saved Checklist will destroyed `,
            'danger',
          );
          this.router.navigateByUrl('/list-master/offline-data');
          return;
        }
        this.assignCheckList = [];
        this.attendedCheckList = [];
        this.common.presentLoading('Deleteing Data from Local Database').then(() => {
          db.checklist.where('schedule_date').equals(this.selectedDate).delete().then(() => {
            this.common.dismissloading();
            this.pagination = { offset: 0, total: 0, hasMore: false };
            this.fetchChecklistFromServer(this.selectedDate, 0);
          });
        });
      },
    );
  }

  private loadChecklistForDate(date: string) {
    this.common.presentLoading().then(() => {
      this.subscribeOnceToDexie(
        () => db.checklist.where({ schedule_date: date }).sortBy('sch_dateTime'),
        data => {
          this.common.dismissloading();
          this.splitChecklistsForUser(data);
          if (data.length === 0 && this.isInternet) {
            this.fetchChecklistFromServer(date, this.pagination.offset);
          }
        },
        () => {
          this.common.presentToast('Please clean your phone Cache', 'warning');
          this.common.dismissloading();
        },
      );
    });
  }

  private fetchChecklistFromServer(date: string, offset: number) {
    const message = this.buildFetchLoadingMessage();
    this.common.presentLoading(message).then(() => {
      this.httpDigital.getOfflineCheckListFromServer(date, offset).subscribe({
        next: (res: any) => {
          if (res.status) {
            const incoming = res.data?.data || [];
            if (incoming.length > 0) {
              this.pagination.hasMore = true;
              if (this.pagination.offset === 0) {
                this.pagination.total = res.data.total;
              }
              this.bulkSaveChecklistsToDexie(incoming);
            } else {
              this.pagination.hasMore = false;
              this.loadChecklistForDate(this.selectedDate);
            }
          } else {
            this.reloadFromDexieAfterFailure(date);
          }
        },
        error: (err: any) => {
          this.common.dismissloading();
          if (err.message === 'TIMEOUT') {
            const shouldRetry = confirm('Timeout error. Do you want to retry the request?');
            if (shouldRetry) {
              this.fetchChecklistFromServer(date, offset);
            }
          } else {
            this.common.presentToast(environment.errMsg + ' In Saving Checklist Offline Mode', 'danger');
          }
        },
        complete: () => {
          this.common.dismissloading();
        },
      });
    });
  }

  private buildFetchLoadingMessage(): string {
    const { offset, total } = this.pagination;
    if (!offset || !total) {
      return 'Please Wait, Application is Fetching your Data ';
    }
    const rawPercent = (offset * 100) / total;
    const percent = (rawPercent > 100 ? 100 : rawPercent).toFixed(2);
    return `Please Wait, Application is Fetching your Data ${percent}%`;
  }

  private reloadFromDexieAfterFailure(date: string) {
    this.common.presentLoading().then(() => {
      this.subscribeOnceToDexie(
        () => db.checklist.where({ schedule_date: date }).sortBy('sch_dateTime'),
        data => {
          this.common.dismissloading();
          this.splitChecklistsForUser(data, /*sortAssigned*/ false, /*strictIdMatch*/ true);
        },
      );
    });
  }

  private async bulkSaveChecklistsToDexie(rows: any[]) {
    await db.checklist.bulkPut(rows);
    if (this.pagination.hasMore && this.pagination.total > PAGE_SIZE) {
      this.pagination.offset += PAGE_SIZE;
      this.fetchChecklistFromServer(this.selectedDate, this.pagination.offset);
    } else {
      this.loadChecklistForDate(this.selectedDate);
    }
  }

  private async pruneOldChecklists(beforeDate: string) {
    await db.checklist.where('schedule_date').below(beforeDate).delete();
  }

  /**
   * Split Dexie result into assigned vs attended lists for the current user.
   * strictIdMatch=true uses exact equality (legacy behavior of the error branch);
   * default uses comma-split contains (the common path).
   */
  private splitChecklistsForUser(
    data: any[],
    sortAssigned: boolean = false,
    strictIdMatch: boolean = false,
  ) {
    const userId = String(this.userData.id);
    const isAssignedToUser = (row: any): boolean => {
      if (strictIdMatch) {
        return row.assign_to === this.userData.id;
      }
      const assignIds = String(row.assign_to || '').split(',').map(id => id.trim());
      return assignIds.includes(userId);
    };

    this.assignCheckList = data.filter(row => row.schedule_status === 'assigned' && isAssignedToUser(row));
    this.attendedCheckList = data.filter(row => row.schedule_status !== 'assigned' && isAssignedToUser(row));

    if (sortAssigned) {
      this.assignCheckList.sort(
        (a, b) => new Date(a.sch_dateTime).getTime() - new Date(b.sch_dateTime).getTime(),
      );
    }
  }

  /**
   * Subscribe to a Dexie liveQuery for one emission, then unsubscribe immediately.
   * Tracks every subscription so `ngOnDestroy` / `ionViewDidLeave` can tear them down
   * even if data never arrives.
   */
  private subscribeOnceToDexie<T>(
    source: () => Promise<T>,
    onNext: (data: T) => void,
    onError?: (err: any) => void,
  ) {
    const query$ = liveQuery(source);
    const sub = query$.subscribe({
      next: data => {
        onNext(data);
        sub.unsubscribe();
        this.activeDexieSubs = this.activeDexieSubs.filter(s => s !== sub);
      },
      error: err => {
        if (onError) {
          onError(err);
        }
        sub.unsubscribe();
        this.activeDexieSubs = this.activeDexieSubs.filter(s => s !== sub);
      },
    });
    this.activeDexieSubs.push(sub);
  }

  private disposeDexieSubs() {
    this.activeDexieSubs.forEach(sub => sub.unsubscribe());
    this.activeDexieSubs = [];
  }

  shouldShowJustification(item: any): boolean {
    if (item.schedule_date !== moment().format('YYYY-MM-DD')) {
      return true;
    }
    return moment().isAfter(moment(item.sch_endDateTime));
  }

  trackByScheduleId(_index: number, item: any): any {
    return item?.schedule_id ?? item?.schedule_unique_id ?? _index;
  }

  changeDateComponent(ev: any) {
    const picked = moment(ev.detail.value);
    const fulldate = picked.format('YYYY-MM-DD');
    this.selectedDate = fulldate;
    const day: CalendarDay = {
      date: picked.format('DD'),
      day: picked.format('dddd')[0],
      fulldate,
      ind: parseInt(picked.format('DD'), 10),
      isSelect: true,
    };
    this.buildCalendarStrip(fulldate);
    this.changeCalendarDate(day);
    this.popoverDatetime.confirm(true);
  }

  changeCalendarDate(day: CalendarDay) {
    const slideIndex = Math.max(0, day.ind - 3);
    this.slides.slideTo(slideIndex);
    this.dateArr.forEach(d => (d.isSelect = d.date === day.date));
    this.selectedDate = day.fulldate;
    this.assignCheckList = [];
    this.attendedCheckList = [];
    this.loadChecklistForDate(this.selectedDate);
  }

  verifyQr(data: any) {
    if (this.isFillTimeOver(data)) {
      this.showFillTimeOverAlert(data);
      return;
    }
    if (this.platform.is('capacitor') && (!this.scanBarcodeDetail.isScanBarcode && data.is_site_level == 0)) {
      this.qrType = data.barcode ? 'verify' : 'loc-verify';
      this.qrObject = data;
      this.router.navigateByUrl('/barcode');
    } else {
      this.openFillReport(data);
    }
  }

  /** Returns true if this assigned checklist's sch_endDateTime has already passed. */
  private isFillTimeOver(data: any): boolean {
    if (!data || data.schedule_status !== 'assigned' || !data.sch_endDateTime) {
      return false;
    }
    return moment().isAfter(moment(data.sch_endDateTime));
  }

  private async showFillTimeOverAlert(data: any) {
    const endTimeLabel = moment(data.sch_endDateTime).format('h:mm A');
    const alert = await this.alertController.create({
      mode: 'ios',
      header: 'Fill time over',
      message: `Aap is checklist ko ab fill nahi kar sakte. Last fill time was ${endTimeLabel}. Please submit justification.`,
      buttons: ['OK'],
    });
    await alert.present();
  }

  openFillReport(data: any) {
    if (!this.platform.is('capacitor')) {
      this.navigateToFillReport(data);
      return;
    }

    if (data.schedule_status !== 'assigned') {
      this.navigateToFillReport(data);
      return;
    }

    const scheduleDate = moment(data.sch_dateTime).format('YYYY-MM-DD');
    if (moment().format('YYYY-MM-DD') !== scheduleDate) {
      this.common.presentToast('You can fill only Current Date Checklist', 'warning');
      return;
    }

    const scheduleStartTime = moment(data.sch_dateTime);
    const scheduleEndTime = moment(data.sch_endDateTime);
    const currentTime = moment();

    if (currentTime.isBefore(scheduleStartTime)) {
      this.common.presentToast(
        `You cant fill Checklist before Time, this Checklist time is ${scheduleStartTime.format('h:mm:ss A')}`,
        'warning',
      );
      return;
    }
    if (currentTime.isAfter(scheduleEndTime)) {
      this.common.presentToast(
        `Checklist time is over. You can not fill after ${scheduleEndTime.format('h:mm:ss A')}`,
        'warning',
      );
      return;
    }

    this.navigateToFillReport(data);
  }

  private navigateToFillReport(data: any) {
    this.router.navigate(['/digital-checklist/fill-report/'], {
      queryParams: {
        isOnBehalf: this.isOnBehalf,
        schedule_id: data.schedule_id,
      },
    });
  }

  openBarcode() {
    this.qrType = 'site';
    this.router.navigateByUrl('/barcode');
  }

  private buildCalendarStrip(forDate: string) {
    const anchor = moment(forDate);
    const anchorFormatted = anchor.format('YYYY-MM-DD');
    const daysInMonth = parseInt(anchor.endOf('month').format('DD'), 10);
    const monthStart = moment(forDate).startOf('month');

    let selectedIndex = 0;
    this.dateArr = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const dayDate = monthStart.clone().add(i - 1, 'day');
      const fulldate = dayDate.format('YYYY-MM-DD');
      const isSelect = fulldate === anchorFormatted;
      if (isSelect) {
        selectedIndex = i;
      }
      this.dateArr.push({
        date: dayDate.format('DD'),
        day: dayDate.format('dddd')[0],
        isSelect,
        ind: i,
        fulldate,
      });
    }

    setTimeout(() => {
      this.slides?.slideTo(Math.max(0, selectedIndex - 3));
    }, 50);
  }

  async openJustification(data: any) {
    const modal = await this.modalCtrl.create({
      component: JustificationComponent,
      cssClass: 'my-modal',
      componentProps: { data },
    });
    modal.present();
  }
}
