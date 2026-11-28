import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController } from '@ionic/angular';
import { MailroomService } from 'src/app/provider/mailroom/mailroom.service';
import { MailroomUiService } from 'src/app/provider/mailroom/mailroom-ui.service';

/**
 * Hand over (deliver).
 * Proof: desk round par code nahi lagta; warna recipient ka 6-digit pickup code,
 * ya (packages.override_pickup ho to) reason ke saath override.
 * Pickup code staff ko kabhi nahi milta - recipient se poochna hai.
 */
@Component({
  selector: 'app-mr-deliver',
  templateUrl: './mr-deliver.component.html',
})
export class MrDeliverComponent {

  id = '';
  p: any = null;
  loading = true;
  errorMsg = '';

  collector: 'self' | 'alternate' | 'proxy' = 'self';
  collectorName = '';
  idChecked = false;
  idType = '';
  idTypes = ['Company ID', 'Govt ID', 'Driving licence', 'Other'];

  code = '';
  useOverride = false;
  overrideReason = '';
  signature = '';
  photo = '';
  codeError = '';

  constructor(
    public mr: MailroomService,
    public ui: MailroomUiService,
    private route: ActivatedRoute,
    private navCtrl: NavController,
  ) {
    this.id = this.route.snapshot.paramMap.get('id') || '';
  }

  async ionViewDidEnter() {
    if (this.p) { return; }   // signature / camera se wapas aane par form na mite
    if (!(await this.mr.ready())) {
      this.navCtrl.navigateRoot('/mailroom-mgt');
      return;
    }
    try {
      this.p = (await this.mr.packageDetail(this.id)).data;
    } catch (err) {
      this.errorMsg = this.mr.msg(err);
    }
    this.loading = false;
  }

  /** Chalu desk round par hai -> pickup code nahi chahiye */
  get desk(): boolean {
    return this.p?.status === 'Out for Delivery' && this.p?.deliveryRound?.status === 'in_progress';
  }
  get needCode(): boolean { return !this.desk && !!this.p?.requirePickupCode && !!this.p?.hasPickupCode; }
  get canOverride(): boolean { return this.needCode && this.mr.can('packages.override_pickup'); }
  get needSignature(): boolean {
    return !!this.p?.requiresSignature || this.mr.setting('general', 'requireSignature', true);
  }
  get needPhoto(): boolean { return this.mr.setting('automation', 'requirePhotoOnDeliver', false); }
  get showPhoto(): boolean { return this.needPhoto || this.mr.setting('general', 'enablePhotoCapture', true); }
  get alternate(): string { return this.p?.recipient?.alternateRecipient || ''; }

  async sign() {
    const s = await this.ui.signature();
    if (s) { this.signature = s; }
  }

  takePhoto() { this.ui.photo(url => this.photo = url); }

  private validate(): string {
    if (this.collector === 'proxy') {
      if (!this.collectorName.trim()) { return 'Enter the name of the person collecting the package'; }
      if (!this.idChecked) { return 'Check the collector\'s ID before handing the package to someone else'; }
    }
    if (this.needCode) {
      if (this.useOverride) {
        if (this.overrideReason.trim().length < 5) { return 'Give a reason (at least 5 characters) for handing over without the pickup code'; }
      } else if (!/^\d{6}$/.test(this.code.trim())) {
        return 'Enter the 6-digit pickup code the recipient received';
      }
    }
    if (this.needSignature && !this.signature) { return 'A signature is required to deliver this package'; }
    if (this.needPhoto && !this.photo) { return 'A delivery photo is required'; }
    return '';
  }

  async submit() {
    const problem = this.validate();
    if (problem) { this.ui.warn(problem); return; }

    const body: any = { collectedByType: this.collector };
    if (this.collector === 'proxy') {
      body.collectedByName = this.collectorName.trim();
      body.idChecked = true;
      if (this.idType) { body.idType = this.idType; }
    }
    if (this.needCode) {
      if (this.useOverride) { body.overrideReason = this.overrideReason.trim(); } else { body.pickupCode = this.code.trim(); }
    }
    if (this.signature) { body.signature = this.signature; }
    if (this.photo) { body.photo = this.photo; }

    this.codeError = '';
    await this.ui.showLoader('Handing over...');
    try {
      const res = await this.mr.deliverPackage(this.id, body);
      this.ui.hideLoader();
      this.ui.ok(res.message);
      this.navCtrl.back();
    } catch (err: any) {
      this.ui.hideLoader();
      const left = err?.error?.errors?.attemptsLeft;
      if (left !== undefined && left !== null) {
        // galat code: form waisa hi rakho
        this.codeError = `Wrong code, ${left} ${left === 1 ? 'try' : 'tries'} left`;
        this.code = '';
      } else if (err?.status === 429) {
        this.codeError = this.mr.msg(err);
      }
      this.ui.error(err);
    }
  }
}
