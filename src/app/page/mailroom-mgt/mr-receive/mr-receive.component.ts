import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController, NavController } from '@ionic/angular';
import { MailroomService } from 'src/app/provider/mailroom/mailroom.service';
import { MailroomUiService } from 'src/app/provider/mailroom/mailroom-ui.service';
import { MrStoragePickerComponent } from '../mr-pickers/mr-storage-picker.component';
import { MrRecipientPickerComponent } from '../mr-pickers/mr-recipient-picker.component';

const MAX_PHOTOS = 3;

/**
 * Package receive karna:
 * scan / tracking number -> duplicate warning -> carrier -> recipient -> type -> photos -> storage -> save.
 * Offline queue nahi hoti: capacity aur duplicate check server par usi waqt hote hain.
 */
@Component({
  selector: 'app-mr-receive',
  templateUrl: './mr-receive.component.html',
})
export class MrReceiveComponent {

  // khaali form pehle se, taaki session check ke dauran template ko f.photos mile
  f: any = MrReceiveComponent.blank();
  recipient: any = null;
  storage: any = null;
  duplicates: any[] = [];
  submitted = false;
  moreOpen = false;
  done: any = null;       // save hone ke baad ka package (success screen)
  doneMessage = '';

  private checkedFor = '';
  private carrierPicked = false;
  private scanning = false;
  private inited = false;

  constructor(
    public mr: MailroomService,
    public ui: MailroomUiService,
    private router: Router,
    private navCtrl: NavController,
    private modalCtrl: ModalController,
  ) { }

  async ionViewDidEnter() {
    if (!(await this.mr.ready())) {
      this.navCtrl.navigateRoot('/mailroom-mgt');
      return;
    }
    if (!this.inited) {
      this.inited = true;
      this.reset();
    }
    if (this.scanning) {
      this.scanning = false;
      const code = this.ui.takeScan();
      if (code) {
        this.f.trackingNumber = code;
        this.onTracking();
      }
    }
  }

  private static blank(): any {
    return {
      trackingNumber: '', carrierId: '', packageType: '',
      photos: [], labelPhoto: '',
      fragile: false, perishable: false, requiresRefrigeration: false, isHighValue: false, requiresSignature: false,
      senderName: '', senderCompany: '', weight: '', notes: '',
    };
  }

  reset() {
    const def = this.mr.setting('general', 'defaultCarrier', '');
    const defCarrier = this.mr.carriers.find(c => c.id === def || c.name === def);
    this.f = MrReceiveComponent.blank();
    this.f.carrierId = defCarrier?.id || '';
    const types = this.mr.packageTypes;
    this.f.packageType = (types.find(t => t.name === 'Envelope') || types[0])?.name || '';
    this.onTypeChange();
    this.recipient = null;
    this.storage = null;
    this.duplicates = [];
    this.submitted = false;
    this.moreOpen = false;
    this.done = null;
    this.checkedFor = '';
    this.carrierPicked = false;
  }

  // ----- settings / rules -----
  get scanEnabled(): boolean { return this.mr.setting('general', 'enableBarcodeScanning', true); }
  get typeInfo(): any { return this.mr.packageTypes.find(t => t.name === this.f.packageType); }
  get photoRequired(): boolean {
    return this.mr.setting('automation', 'requirePhotoOnReceive', false) || !!this.typeInfo?.requiresPhoto;
  }
  get photoEnabled(): boolean { return this.photoRequired || this.mr.setting('general', 'enablePhotoCapture', true); }
  get canAddPhoto(): boolean { return this.f.photos.length < MAX_PHOTOS; }
  get canPickStorage(): boolean { return this.mr.can('storage.view', 'storage.manage'); }
  get autoStorage(): boolean { return this.mr.setting('automation', 'autoAssignStorage', false); }

  // ----- tracking number -----
  scan() {
    this.scanning = true;
    this.ui.startScan();
  }

  /** Tracking number badla: duplicate check + carrier pehchanna */
  async onTracking() {
    const t = (this.f.trackingNumber || '').trim();
    if (!t || t === this.checkedFor) { return; }
    this.checkedFor = t;
    if (!this.carrierPicked) {
      const c = this.mr.detectCarrier(t);
      if (c) { this.f.carrierId = c.id; }
    }
    try {
      const res = await this.mr.checkTracking(t);
      if (this.checkedFor === t) { this.duplicates = res.data?.duplicates || []; }
    } catch {
      this.duplicates = [];   // warning hi hai; server duplicate block nahi karta
    }
  }

  onCarrierPick() { this.carrierPicked = true; }

  onTypeChange() {
    // type ka rule: signature preset. (photo rule photoRequired getter se)
    this.f.requiresSignature = !!this.typeInfo?.requiresSignature;
    if (this.storage && this.mr.storageBlockReason(this.storage, this.f.packageType)) { this.storage = null; }
  }

  // ----- pickers -----
  async pickRecipient() {
    const modal = await this.modalCtrl.create({ component: MrRecipientPickerComponent });
    await modal.present();
    const r = (await modal.onWillDismiss()).data;
    if (r) { this.recipient = r; }
  }

  async pickStorage() {
    const modal = await this.modalCtrl.create({
      component: MrStoragePickerComponent,
      componentProps: { packageType: this.f.packageType },
    });
    await modal.present();
    const u = (await modal.onWillDismiss()).data;
    if (u) { this.storage = u; }
  }

  addPhoto() { this.ui.photo(url => this.f.photos.push(url)); }
  removePhoto(i: number) { this.f.photos.splice(i, 1); }
  addLabelPhoto() { this.ui.photo(url => this.f.labelPhoto = url); }

  // ----- save -----
  async submit() {
    this.submitted = true;
    const tracking = (this.f.trackingNumber || '').trim();
    if (!tracking) { this.ui.warn('Scan or enter the tracking number'); return; }
    if (!this.recipient) { this.ui.warn('Select the recipient'); return; }
    if (this.photoRequired && !this.f.photos.length) { this.ui.warn('A package photo is required'); return; }

    const body: any = {
      trackingNumber: tracking,
      recipientId: this.recipient.id,
      fragile: this.f.fragile,
      perishable: this.f.perishable,
      requiresRefrigeration: this.f.requiresRefrigeration,
      isHighValue: this.f.isHighValue,
      requiresSignature: this.f.requiresSignature,
    };
    if (this.f.carrierId) { body.carrierId = this.f.carrierId; }
    if (this.f.packageType) { body.packageType = this.f.packageType; }
    if (this.storage) { body.storageLocationId = this.storage.id; }
    if (this.f.photos.length) { body.photos = this.f.photos; }
    if (this.f.labelPhoto) { body.labelPhoto = this.f.labelPhoto; }
    const handling = [
      this.f.fragile && 'Fragile', this.f.perishable && 'Perishable',
      this.f.requiresRefrigeration && 'Refrigerated', this.f.isHighValue && 'High Value',
    ].filter(Boolean);
    if (handling.length) { body.specialHandling = handling; }
    for (const k of ['senderName', 'senderCompany', 'notes']) {
      const v = (this.f[k] || '').trim();
      if (v) { body[k] = v; }
    }
    const w = Number(this.f.weight);
    if (this.f.weight !== '' && this.f.weight !== null && !isNaN(w) && w > 0) { body.weight = w; }

    const res = await this.ui.busy(() => this.mr.receivePackage(body), 'Saving package...');
    if (!res) { return; }
    this.done = res.data;
    this.doneMessage = res.message;
    this.ui.ok(res.message);
  }

  view() {
    this.router.navigateByUrl('/mailroom-mgt/package/' + this.done.id, { replaceUrl: true });
  }
}
