import { Component, OnDestroy, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { CommonService } from 'src/app/provider/common/common.service';
import { FeedbackService } from 'src/app/provider/feedback/feedback.service';
import { BlockComponent } from 'src/app/shared/block/block.component';
import { BuildingComponent } from 'src/app/shared/building/building.component';
import { CostCenterComponent } from 'src/app/shared/cost-center/cost-center.component';
import { FloorComponent } from 'src/app/shared/floor/floor.component';
import { LocationComponent } from 'src/app/shared/location/location.component';
import { environment } from 'src/environments/environment';

type Step = 'location' | 'category' | 'rating' | 'options' | 'thanks';
type Level = 'site' | 'block' | 'building' | 'floor' | 'location';

@Component({
  selector: 'app-feedback',
  templateUrl: './feedback.page.html',
  styleUrls: ['./feedback.page.scss'],
})
export class FeedbackPage implements OnInit, OnDestroy {
  private readonly storeKey = 'feedback_location';   // chuni hui location + token device par yaad rehta hai
  levels: Level[] = ['site', 'block', 'building', 'floor', 'location'];
  labels: any = { site: 'Site', block: 'Block', building: 'Building', floor: 'Floor', location: 'Location' };

  step: Step = 'location';
  token = '';
  loc: any = this.emptyLoc();
  loading = false;
  submitting = false;

  form: any = null;        // { location, ratings, categories }
  category: any = null;
  rating: any = null;      // { value, label }
  selected: any[] = [];    // chune hue q_id
  otherOpen = false;
  otherText = '';
  contactOpen = false;
  contact: any = { name: '', phone_no: '', email: '', emp_code: '' };
  thanksMsg = '';

  private idleTimer: any;
  private thanksTimer: any;

  // Smiley ke rang aur chehre (web kiosk jaise)
  private faces: any = {
    5: { emoji: '😄', color: '#2e9d4a' },
    4: { emoji: '🙂', color: '#6abf4b' },
    3: { emoji: '😐', color: '#9bbf2a' },
    2: { emoji: '🙁', color: '#d9a400' },
    1: { emoji: '😞', color: '#d64545' }
  };

  // Backend ke preset icon keys -> app ke icons. Anjaan key par 'other'.
  private presets: any = {
    feedback: 'chatbubble-ellipses-outline', washroom: 'male-female-outline', cleaning: 'brush-outline',
    toiletries: 'file-tray-stacked-outline', leak: 'construct-outline', odour: 'cloud-outline',
    soap: 'hand-left-outline', dustbin: 'trash-outline', water: 'water-outline', handdryer: 'hand-right-outline',
    ac: 'thermometer-outline', light: 'bulb-outline', pest: 'bug-outline', pantry: 'cafe-outline',
    staff: 'people-outline', security: 'shield-checkmark-outline', wifi: 'wifi-outline', parking: 'car-outline',
    thumbsup: 'thumbs-up-outline', sparkle: 'sparkles-outline', flower: 'flower-outline',
    other: 'ellipsis-horizontal-circle-outline'
  };

  constructor(
    private modalCtrl: ModalController,
    private common: CommonService,
    private httpFeedback: FeedbackService
  ) { }

  // Pehle se chuni hui location ho to seedhe smileys khulte hain
  ngOnInit() {
    try {
      const saved = JSON.parse(localStorage.getItem(this.storeKey) || 'null');
      if (saved?.token && saved?.loc?.location_id) {
        this.loc = saved.loc;
        this.token = saved.token;
        this.loadForm(true);
      }
    } catch (e) { }
  }

  ngOnDestroy() {
    clearTimeout(this.idleTimer);
    clearTimeout(this.thanksTimer);
  }

  ionViewWillLeave() {
    clearTimeout(this.idleTimer);
    clearTimeout(this.thanksTimer);
  }

  emptyLoc(): any {
    return {
      site_id: '', site: '', block_id: '', block: '', building_id: '', building: '',
      floor_id: '', floor: '', location_id: '', location: ''
    };
  }

  // Site -> Block -> Building -> Floor -> Location, har level pichhle par nirbhar hai
  async pick(level: Level) {
    const i = this.levels.indexOf(level);
    if (i > 0 && !this.loc[this.levels[i - 1] + '_id']) {
      this.common.presentToast('Please select ' + this.labels[this.levels[i - 1]] + ' first', 'warning');
      return;
    }
    const pickers: any = {
      site: { component: CostCenterComponent, props: {} },
      block: { component: BlockComponent, props: { allData: { pc_id: this.loc.site_id } } },
      building: { component: BuildingComponent, props: { id: this.loc.block_id } },
      floor: { component: FloorComponent, props: { bldg_id: this.loc.building_id } },
      location: { component: LocationComponent, props: { floor_id: this.loc.floor_id } }
    };
    const modal = await this.modalCtrl.create({
      component: pickers[level].component,
      cssClass: 'my-modal',
      componentProps: pickers[level].props
    });
    modal.onWillDismiss().then(res => {
      const d = res.data;
      if (!d) {
        return;
      }
      this.loc[level + '_id'] = d.value ?? d.pc_id;
      this.loc[level] = d.label || d.pc_desc || d.location_desc || '';
      // upar ka level badla to neeche ke sab khaali
      this.levels.slice(i + 1).forEach(l => {
        this.loc[l + '_id'] = '';
        this.loc[l] = '';
      });
    });
    return modal.present();
  }

  // Chuni hui location ka token lo (login token ke saath), phir form kholo
  start(afterExpiry = false) {
    if (!this.loc.location_id) {
      this.common.presentToast('Please select a location', 'warning');
      return;
    }
    this.loading = true;
    this.httpFeedback.ensureToken(this.loc.location_id).subscribe({
      next: (res: any) => {
        const d = res?.data || {};
        if (!res.status || !d.qr_token) {
          this.fail(res.msg || 'Location not found.');
        } else if (d.module_on === false) {
          this.fail('Feedback module is off for this site');
        } else if (Number(d.is_active) === 0) {
          this.fail('Feedback is off for this location');
        } else {
          this.token = d.qr_token;
          this.save();
          this.loadForm(false, afterExpiry);
        }
      },
      error: (err: any) => {
        this.fail(this.httpError(err));
      }
    });
  }

  fail(msg: string) {
    this.loading = false;
    this.form = null;
    this.step = 'location';
    this.common.presentToast(msg, 'warning');
  }

  save() {
    localStorage.setItem(this.storeKey, JSON.stringify({ loc: this.loc, token: this.token }));
  }

  // retried = token ek baar naya le chuke hain, dobara loop nahi
  loadForm(fromSaved = false, retried = false) {
    this.loading = true;
    this.httpFeedback.getForm(this.token).subscribe({
      next: (res: any) => {
        if (res.status) {
          this.loading = false;
          this.form = res.data;
          this.startOver();
        } else if (!retried && /invalid|expired/i.test(String(res.msg || ''))) {
          // admin ne QR regenerate / remove kiya hoga: naya token lekar ek baar phir
          this.start(true);
        } else {
          this.fail(res.msg || 'Feedback form not found');
        }
      },
      error: (err: any) => {
        this.fail(this.httpError(err));
      }
    });
  }

  httpError(err: any): string {
    return err?.status === 429 ? 'Too many submissions, please wait a minute.' : environment.errMsg;
  }

  get categories(): any[] {
    return this.form?.categories || [];
  }

  // Upar ke card ka bada naam (location) aur uske neeche ki chhoti line
  get placeName(): string {
    const l = this.form?.location || {};
    return l.location || l.site || 'Feedback';
  }

  get placeSub(): string {
    const l = this.form?.location || {};
    return [l.location ? l.site : '', l.block, l.building, l.floor].filter(v => !!v && v !== 'NA').join(' · ');
  }

  get locationLine(): string {
    const l = this.form?.location || {};
    return [l.site, l.location, l.block, l.building, l.floor].filter(v => !!v).join(' · ');
  }

  // Ek se zyada category ho to pehle chooser, warna seedhe smileys
  startOver() {
    clearTimeout(this.idleTimer);
    clearTimeout(this.thanksTimer);
    this.resetAnswer();
    if (this.categories.length > 1) {
      this.category = null;
      this.step = 'category';
    } else {
      this.category = this.categories[0] || null;
      this.step = 'rating';
    }
  }

  resetAnswer() {
    this.rating = null;
    this.selected = [];
    this.otherOpen = false;
    this.otherText = '';
    this.contactOpen = false;
    this.contact = { name: '', phone_no: '', email: '', emp_code: '' };
  }

  pickCategory(cat: any) {
    this.category = cat;
    this.resetAnswer();
    this.step = 'rating';
  }

  pickRating(r: any) {
    this.rating = r;
    // rating badalne par jo options ab nahi dikhte unki selection hata do
    const visible = this.options.map(o => o.q_id);
    this.selected = this.selected.filter(id => visible.includes(id));
    this.step = 'options';
    this.touch();
  }

  matches(scope: any, rating: number): boolean {
    const s = String(scope ?? '').trim();
    if (/^[1-5](,[1-5])*$/.test(s)) {
      return s.split(',').includes(String(rating));
    }
    if (s === 'positive') { return rating >= 4; }
    if (s === 'negative') { return rating <= 3; }
    return true;   // 'all' ya khaali
  }

  get options(): any[] {
    if (!this.rating) {
      return [];
    }
    return (this.category?.options || []).filter((o: any) => this.matches(o.rating_scope, this.rating.value));
  }

  get prompt(): string {
    return this.rating?.value >= 4 ? 'What did you like?' : 'What needs attention?';
  }

  toggle(opt: any) {
    const i = this.selected.indexOf(opt.q_id);
    if (i >= 0) {
      this.selected.splice(i, 1);
    } else {
      this.selected.push(opt.q_id);
    }
    this.touch();
  }

  isSelected(opt: any): boolean {
    return this.selected.includes(opt.q_id);
  }

  face(value: number): any {
    return this.faces[value] || this.faces[3];
  }

  // Line-art smiley ka muh: 5 = badi muskaan ... 2 = seedha, 1 = udaas
  mouth(value: number): string {
    return value >= 5 ? 'M19 37 Q32 53 45 37' : value === 4 ? 'M21 39 Q32 49 43 39'
      : value === 3 ? 'M23 41 Q32 46 41 41' : value === 2 ? 'M23 43 H41' : 'M22 46 Q32 36 42 46';
  }

  isImage(icon: string): boolean {
    return /^https?:\/\//.test(String(icon || ''));
  }

  iconName(icon: string, fallback: string): string {
    const key = String(icon || '').startsWith('preset:') ? String(icon).slice(7) : '';
    return this.presets[key] || this.presets[fallback];
  }

  // Options screen par 30 second tak koi touch na ho to smileys par wapas
  touch() {
    clearTimeout(this.idleTimer);
    if (this.step === 'options') {
      this.idleTimer = setTimeout(() => {
        if (this.step === 'options' && !this.submitting) {
          this.startOver();
        }
      }, 30000);
    }
  }

  back() {
    clearTimeout(this.idleTimer);
    if (this.step === 'options') {
      this.step = 'rating';
    } else if (this.step === 'rating' && this.categories.length > 1) {
      this.step = 'category';
    }
  }

  // Supervisor doosri location chunna chahe
  changeLocation() {
    clearTimeout(this.idleTimer);
    clearTimeout(this.thanksTimer);
    this.form = null;
    this.step = 'location';
  }

  contactError(): string {
    const c = this.contact;
    if (c.phone_no && !/^[0-9+\- ]{6,20}$/.test(c.phone_no)) {
      return 'Please enter a valid contact number.';
    }
    if (c.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) {
      return 'Please enter a valid email.';
    }
    return '';
  }

  submit() {
    if (this.submitting) {
      return;
    }
    const err = this.contactError();
    if (err) {
      this.contactOpen = true;
      this.common.presentToast(err, 'warning');
      return;
    }
    clearTimeout(this.idleTimer);
    const body = {
      cat_id: this.category.cat_id,
      rating: this.rating.value,
      option_ids: this.selected,
      other_text: this.otherOpen ? this.otherText.trim() : '',
      name: this.contact.name.trim(),
      phone_no: this.contact.phone_no.trim(),
      email: this.contact.email.trim(),
      emp_code: this.contact.emp_code.trim()
    };
    this.submitting = true;
    this.httpFeedback.submit(this.token, body).subscribe({
      next: (res: any) => {
        this.submitting = false;
        if (res.status) {
          this.showThanks(res.msg);
        } else {
          this.common.presentToast(res.msg || 'Could not submit feedback. Please try again.', 'warning');
          this.touch();
        }
      },
      error: (e: any) => {
        this.submitting = false;
        this.common.presentToast(this.httpError(e), 'danger');
        this.touch();
      }
    });
  }

  // Thank you 5 second dikhta hai, phir smileys (ya category chooser) par wapas
  showThanks(msg: string) {
    this.thanksMsg = msg || 'Thank you for your feedback!';
    this.step = 'thanks';
    this.chime();
    TextToSpeech.speak({
      text: 'Thank you for your feedback', lang: 'en-IN', rate: 1.0, pitch: 1.0, volume: 1.0, category: 'ambient'
    }).catch(() => { });
    this.thanksTimer = setTimeout(() => this.startOver(), 5000);
  }

  // Chhoti si upar chadhti dhun; device par audio na chale to chup-chaap chhod do
  chime() {
    try {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx = new Ctx();
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const at = ctx.currentTime + i * 0.14;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, at);
        gain.gain.exponentialRampToValueAtTime(0.2, at + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(at);
        osc.stop(at + 0.32);
      });
      setTimeout(() => ctx.close(), 1200);
    } catch (e) { }
  }

}
