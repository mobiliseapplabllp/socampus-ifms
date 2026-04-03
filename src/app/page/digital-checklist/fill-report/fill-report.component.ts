import { Component, ElementRef, NgZone, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { MediaCapture, CaptureVideoOptions } from '@awesome-cordova-plugins/media-capture/ngx';
import { Filesystem } from '@capacitor/filesystem';
import { ActivatedRoute } from '@angular/router';
import { AlertController, ModalController, NavController, Platform, ViewWillEnter } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { DigitalChecklistService } from 'src/app/provider/digital-checklist/digital-checklist.service';
import { SignatureComponent } from 'src/app/shared/signature/signature.component';
import { environment } from 'src/environments/environment';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { SpeechRecognition } from "@capacitor-community/speech-recognition";
import { checklist, db } from '../../../provider/local-db/local-db.service';
import { take } from 'rxjs/operators';
import * as moment from 'moment';
import { PhotoViewComponent } from 'src/app/shared/photo-view/photo-view.component';
import { ComplaintService } from 'src/app/provider/complaint/complaint.service';
import { CameraService } from 'src/app/provider/camera/camera.service';
@Component({
  selector: 'app-fill-report',
  templateUrl: './fill-report.component.html',
  styleUrls: ['./fill-report.component.scss'],
})
export class FillReportComponent implements OnInit, ViewWillEnter {
  @ViewChildren('a') private itemlist!: QueryList<ElementRef>;
  @ViewChild('videoFileInput') videoFileInput!: ElementRef<HTMLInputElement>;
  /** Blocks Dexie writes while UI applies a Dexie snapshot (avoids ionChange → update loops during hydrate). */
  private applyingDbSnapshot = false;
  scheduleArr: any = [];
  schedule_id: any;
  loading: any;
  remark: any;
  signatureBase64!: any;
  schedule_status: any;
  sign_attachment: any;
  on_behalf: any;
  remarkErr = false;
  arr: any = [];
  selectedLanguage =  'en';
  index: any;
  loop = false;
  isInternet!:boolean;
  offline_save!: string;
  userData: any = [];
  ticketMsg!: string;
  videoPreviewOpen = false;
  videoObjectUrl = '';
  private videoPickTarget: any = null;

  constructor(
    private activeRoute: ActivatedRoute,
    private httpDigital: DigitalChecklistService,
    private common: CommonService,
    private navCtrl: NavController,
    private modalCtrl: ModalController,
    private platform: Platform,
    private alertController: AlertController,
    private httpComplaint: ComplaintService,
    private camera: CameraService,
    private mediaCapture: MediaCapture,
    private ngZone: NgZone
  ) { }

  ngOnInit() {
    this.common.checkInternet().then(res => {
      if (res) {
        this.isInternet = true;
      } else {
        this.isInternet = false;
      }
    });
    const user = localStorage.getItem('user');
    if (user) {
      this.userData = JSON.parse(user);
    }
    this.selectedLanguage = 'en';

    if (this.platform.is('capacitor')) {
      SpeechRecognition.checkPermissions().then(res => {
        if (res.speechRecognition === 'granted') {
          return
        } else {
          this.permission();
        }
      });
    }
  }

  /** One-shot hydrate from Dexie when entering the page — no liveQuery (avoids scroll jump / re-patch on every save). */
  async ionViewWillEnter() {
    const qp = this.activeRoute.snapshot.queryParamMap;
    this.on_behalf = qp.get('isOnBehalf') ?? this.on_behalf;
    const rawSid = qp.get('schedule_id');
    this.schedule_id = rawSid != null && rawSid !== '' ? parseInt(rawSid, 10) : NaN;
    await this.hydrateChecklistFromDexieOnce();
  }

  private async hydrateChecklistFromDexieOnce() {
    if (this.schedule_id == null || Number.isNaN(this.schedule_id)) {
      this.scheduleArr = [];
      this.applyingDbSnapshot = false;
      return;
    }
    const data = await this.getScheuleFromLocal();
    this.applyChecklistSnapshotFromDexie(data);
  }

  private applyChecklistSnapshotFromDexie(data: any[]) {
    if (this.schedule_id == null || Number.isNaN(this.schedule_id)) {
      return;
    }
    if (!data?.length) {
      this.scheduleArr = [];
      this.applyingDbSnapshot = false;
      return;
    }
    this.applyingDbSnapshot = true;
    this.scheduleArr = [...data];
    this.scheduleArr[0].qus?.forEach((q: any) => {
      this.syncNonOptionMandatory(q);
      this.syncOptionResponseTempAfterLoad(q);
    });
    this.schedule_status = this.scheduleArr[0].schedule_status;
    this.remark = this.scheduleArr[0].final_remark;
    this.signatureBase64 = this.scheduleArr[0].base64_sign;
    this.offline_save = this.scheduleArr[0].offline_save;
    this.ngZone.onStable.pipe(take(1)).subscribe(() => {
      queueMicrotask(() => {
        this.applyingDbSnapshot = false;
      });
    });
  }

  /** After Dexie/liveQuery hydrate, match ion-radio temp so changeResponseAction does not treat it as a user change. */
  private syncOptionResponseTempAfterLoad(q: any) {
    if (this.questionKind(q) !== 'option') {
      return;
    }
    if (q.rspns != null && q.rspns !== '') {
      q.rspns_temp = q.rspns;
    }
  }

  /** Stable snapshot of persisted checklist fields — used to skip redundant UI patches and Dexie puts. */
  private serializeChecklistForCompare(row: any): string {
    if (!row) {
      return '';
    }
    const qus = (row.qus || []).map((q: any) => {
      let imgKey: string | null = null;
      if (q.imagename instanceof Blob) {
        imgKey = `blob:${q.imagename.size}:${q.imagename.type || ''}`;
      } else if (q.imagename != null && typeof q.imagename === 'object') {
        imgKey = 'obj';
      } else if (typeof q.imagename === 'string' && q.imagename) {
        imgKey = `s:${q.imagename.length}`;
      }
      return {
        i: q.q_id,
        r: q.rspns != null && q.rspns !== '' ? String(q.rspns) : null,
        m: String(q.remark ?? '').trim(),
        v: q.q_value != null && q.q_value !== '' ? String(q.q_value) : null,
        img: imgKey,
      };
    });
    qus.sort((a: any, b: any) => (a.i ?? 0) - (b.i ?? 0));
    return JSON.stringify({
      ss: String(row.schedule_status ?? ''),
      fr: String(row.final_remark ?? '').trim(),
      os: String(row.offline_save ?? ''),
      sg: row.base64_sign ? String(row.base64_sign).length : 0,
      fdt: String(row.fill_date_time ?? ''),
      qus,
    });
  }

  async getScheuleFromLocal() {
    return await db.checklist.where({schedule_id: this.schedule_id}).toArray();
  }

  ionViewDidLeave() {
    this.loop = false;
    this.removeListen();
    this.closeVideoPreview();
    const stop = async () => {
      await TextToSpeech.stop();
    };
    stop();
  }

  removeListen() {
    SpeechRecognition.removeAllListeners();
  }

  permission() {
    SpeechRecognition.requestPermissions().then(res => {
    })
  }

  /** UI + validation: map API question_type / q_type */
  questionKind(val: any): 'option' | 'video' | 'attachment' | 'date' | 'datetime' | 'number' | 'temperature' {
    const t = (val?.question_type || '').toString().trim().toLowerCase();
    if (t.includes('date time') || t.includes('datetime')) {
      return 'datetime';
    }
    if (t.includes('date')) {
      return 'date';
    }
    if (t.includes('video')) {
      return 'video';
    }
    if (t.includes('attachment')) {
      return 'attachment';
    }
    if (t.includes('temperature')) {
      return 'temperature';
    }
    if (t.includes('decimal') || (t.includes('number') && !t.includes('phone'))) {
      return 'number';
    }
    if (t.includes('option')) {
      return 'option';
    }
    const qt = String(val?.q_type ?? '');
    switch (qt) {
      case '315': return 'video';
      case '225': return 'attachment';
      case '229': return 'date';
      case '313': return 'datetime';
      case '316': return 'number';
      case '314': return 'temperature';
      case '226':
      default: return 'option';
    }
  }

  /** Extra IMG row for scalar types: always show; mandatory flag only affects validation */
  showExtraDocRow(val: any): boolean {
    const k = this.questionKind(val);
    if (k === 'option' || k === 'attachment' || k === 'video') {
      return false;
    }
    return true;
  }

  /** Non-option questions use a single option row for mandatory flags */
  syncNonOptionMandatory(val: any) {
    if (this.questionKind(val) === 'option') {
      return;
    }
    const o = val.options?.[0];
    if (o) {
      val.isRemarkMandatory = o.is_rmrk_mandatory;
      val.isDocMandatory = o.is_doc_mandatory;
    }
  }

  displayIsoAsDate(iso: string | null | undefined): string {
    if (!iso) {
      return '';
    }
    const m = moment(iso);
    return m.isValid() ? m.format('DD-MM-YYYY') : '';
  }

  displayIsoAsDateTime(iso: string | null | undefined): string {
    if (!iso) {
      return '';
    }
    const m = moment(iso);
    return m.isValid() ? m.format('DD-MM-YYYY HH:mm') : '';
  }

  plainQuestionText(html: string): string {
    if (!html) {
      return '';
    }
    const d = typeof document !== 'undefined' ? document.createElement('div') : null;
    if (d) {
      d.innerHTML = html;
      return (d.textContent || d.innerText || '').trim();
    }
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  clearQuestionHighlight() {
    for (let i = 0; i < this.scheduleArr.length; i++) {
      for (let j = 0; j < this.scheduleArr[i].qus.length; j++) {
        this.scheduleArr[i].qus[j].bgcolor = false;
      }
    }
  }

  hasScalarAnswer(val: any): boolean {
    const v = val.q_value;
    if (v === null || v === undefined) {
      return false;
    }
    if (typeof v === 'string') {
      return v.trim().length > 0;
    }
    return true;
  }

  /** Remark field always visible/editable when schedule allows; mandatory only from server on submit */
  isRemarkInputEnabled(_val: any): boolean {
    return true;
  }

  parseNumericRange(val: any): { min: number; max: number } | null {
    const raw = val?.options?.[0]?.optn_value;
    if (!raw || raw === '{}') {
      return null;
    }
    const parts = String(raw).split(',').map((x: string) => parseFloat(x.trim()));
    if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return { min: parts[0], max: parts[1] };
    }
    return null;
  }

  getNumericHint(val: any): string {
    const r = this.parseNumericRange(val);
    if (!r) {
      return '';
    }
    return `Allowed range: ${r.min} – ${r.max}`;
  }

  isNumberInRange(val: any): boolean {
    const r = this.parseNumericRange(val);
    if (!r) {
      return true;
    }
    const n = parseFloat(String(val.q_value).replace(',', '.'));
    if (isNaN(n)) {
      return false;
    }
    return n >= r.min && n <= r.max;
  }

  isScalarAnswerValid(val: any): boolean {
    const k = this.questionKind(val);
    if (!this.hasScalarAnswer(val)) {
      return false;
    }
    if (k === 'number' || k === 'temperature') {
      return this.isNumberInRange(val);
    }
    return true;
  }

  onScalarAnswerChange(val: any, _ev?: any) {
    if (this.hasScalarAnswer(val) && val.options?.[0]) {
      val.rspns = val.options[0].optn_id;
    }
    val.isNotFill = false;
    this.actionUpdateChecklist();
  }

  speakCondition(val: any, ind: any) {
    this.index = ind;
    val.bgcolor = true;
    val.q_desc_temp = this.plainQuestionText(val.q_desc);
    this.changeBackground(ind);
    this.scroll(ind);

    if (this.questionKind(val) !== 'option') {
      this.loop = false;
      val.tempoutput = '';
      const runSpeak = () => {
        TextToSpeech.speak({
          text: val.q_desc_temp,
          lang: this.selectedLanguage,
          rate: 1.0,
          pitch: 1.0,
          volume: 1.0,
          category: 'ambient',
        }).finally(() => {
          this.clearQuestionHighlight();
        });
      };
      if (this.platform.is('capacitor')) {
        TextToSpeech.isLanguageSupported({ lang: this.selectedLanguage }).then((isSupported) => {
          if (isSupported.supported === false) {
            this.common.presentToastWithOk('Please Select Google Preferred engine. go to Setting and Search "Text-to-speech output" then select "Preferred engine" and select "Speech Recognition and Synthesis"', 'warning');
          }
          runSpeak();
        });
      } else {
        runSpeak();
      }
      return;
    }

    val.tempoutput = 'response';
    this.loop = true;
    val.q_desc_temp = val.q_desc;

    const isLanguageSupported = async (lang: string) => {
      const isSupported = await TextToSpeech.isLanguageSupported({ lang });
      if (isSupported.supported === false) {
        this.common.presentToastWithOk('Please Select Google Preferred engine. go to Setting and Search "Text-to-speech output" then select "Preferred engine" and select "Speech Recognition and Synthesis"', 'warning');
      } else {
        this.speak(val);
      }
    };
    if (this.platform.is('capacitor')) {
      isLanguageSupported(this.selectedLanguage);
    } else {
      this.speak(val);
    }
  }

  async speak(val: any) {
    const speak = async () => {
      await TextToSpeech.speak({
        text: val.q_desc_temp,
        lang: this.selectedLanguage,
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
        category: 'ambient',
      }).finally(() => {
        if (!this.isInternet) {
          return;
        }
        val.speak = true;
        if (val.tempoutput === 'document') {
          if (this.questionKind(val) === 'video') {
            this.captureVideoForQuestion(val);
          } else {
            this.presentActionSheet(val, 2);
          }
        } else if (val.tempoutput === 'final') {
          return;
        } else {
          if (this.questionKind(val) !== 'option') {
            val.speak = false;
            return;
          }
          if (this.platform.is('capacitor')) {
            this.listen(val);
          } else {
            this.listenAction(val, 'No');
          }
        }
      });
    };
    speak();
  }

  listenCondition(val: any) {
    val.speak = false;
    val.tempoutput = 'remark';
    this.loop = false;
    if (this.platform.is('capacitor')) {
      this.listen(val);
    } else {
      this.listenAction(val, 'No');
    }
  }

  listen(val: any) {
    SpeechRecognition.start({
      language: this.selectedLanguage,
      maxResults: 2,
      prompt: val.q_desc,
      partialResults: true,
      popup: true,
    }).then((res: any) => {
      let voiceResponse, voiceResponseTemp: any;
      voiceResponseTemp = res.matches[0];
      if (this.selectedLanguage == 'en' || val.tempoutput === 'remark') {
        voiceResponse = res.matches[0].toLocaleLowerCase();
        this.listenAction(val, voiceResponse);
      } else {
        this.common.presentLoading('Translate String to  English Language').then(preLoad => {
          this.httpDigital.googleTranslate([voiceResponseTemp], 'en').subscribe({
            next:(translateText) => {
              voiceResponse = translateText.data.translations[0].translatedText;
              this.listenAction(val, voiceResponse);
            },
            error:() => {
              this.common.presentToast(environment.errMsg, 'danger');
              this.common.dismissloading();
            },
            complete:() => {
              this.common.dismissloading();
            }
          });
        });
      }
    });
  }

  listenAction(val: any, voiceResponseTemp: any) {
    let respns, option: any, voiceResponse;
    voiceResponse = voiceResponseTemp.toLocaleLowerCase();
    if (!val.tempoutput || val.tempoutput === 'response') {
      if (this.questionKind(val) !== 'option') {
        return;
      }
      if (voiceResponse === 'yes' || voiceResponse === 'yess' || voiceResponse === 'yeees' || voiceResponse === 'yaaa' || voiceResponse === 'ha') {
        option = val.options.filter((ops: any) => ops.optn_value === 'Yes')[0];
        respns = option.optn_id;
      } else if (voiceResponse === 'no' || voiceResponse === 'nooo') {
        option = val.options.filter((ops: any) => ops.optn_value === 'No')[0];
        respns = option.optn_id;
      } else if (voiceResponse === 'n a' || voiceResponse === 'na' || voiceResponse === 'not applicable' || voiceResponse === 'not app') {
        option = val.options.filter((ops: any) => ops.optn_value === 'NA')[0];
        respns = option.optn_id;
      } else {
        val.tempoutput = 'response';
        val.q_desc_temp = 'We Accept Only yes, no and Not Applicable';
        this.speak(val);
        return;
      }
      val.isRemarkMandatory = option.is_rmrk_mandatory;
      val.isDocMandatory = option.is_doc_mandatory;
      val.rspns = respns;
      val.rspns_temp = respns;
      val.isNotFill = false;
      val.speak = true;
      val.bgcolor = false
      this.loop = true;
      if (val.isRemarkMandatory && val.speak) {
        val.tempoutput = 'remark';
        val.q_desc_temp = 'Please Speak Remark';
        this.scroll(this.index);
        this.speak(val);
      } else if (!val.isRemarkMandatory && val.speak) {
        this.repeatLoop();
      }
      this.actionUpdateChecklist();
    } else if (val.tempoutput === 'remark') {
      val.remark = voiceResponse
      const tmp = this.scheduleArr[0].qus[this.index];
      if (tmp.isDocMandatory) {
        tmp.tempoutput = 'document';
        tmp.q_desc_temp = this.questionKind(tmp) === 'video' ? 'Please Record Video' : 'Please Upload Photo';
        this.scroll(this.index);
        this.speak(tmp);
      } else {
        this.repeatLoop();
      }
      this.actionUpdateChecklist();
    } else if (val.tempoutput === 'document') {
      if (this.questionKind(val) === 'video') {
        this.captureVideoForQuestion(val);
      } else {
        this.presentActionSheet(val, 2);
      }
    }
  }

  changeResponseAction(val: any) {
    if (this.questionKind(val) !== 'option') {
      return;
    }
    if (val.rspns != null && val.rspns !== '' && String(val.rspns) === String(val.rspns_temp)) {
      return;
    }
    const obj =
      val.options?.filter((val1: any) => val1.optn_id === val.rspns)[0]
      ?? val.options?.filter((val1: any) => String(val1.optn_id) === String(val.rspns))[0];
    if (!obj) {
      return;
    }
    val.isRemarkMandatory = obj.is_rmrk_mandatory;
    val.isDocMandatory = obj.is_doc_mandatory;
    val.rspns_temp = val.rspns;
    val.isNotFill = false;
    val.speak = false;
    val.bgcolor = false;
    this.loop = false;
    this.actionUpdateChecklist();
  }

  actionUpdateChecklist(obj?: any) {
    if (this.applyingDbSnapshot) {
      return;
    }
    const updatedData: Partial<checklist> = this.scheduleArr[0];
    this.updateCheckList(this.schedule_id, updatedData);
  }

  updateCheckList(scheduleUniqueId: number, updatedData: Partial<checklist>) {
    return db.checklist.where('schedule_id').equals(scheduleUniqueId).first().then((existingRecord) => {
      if (!existingRecord) {
        throw new Error('Record not found');
      }
      const before = this.serializeChecklistForCompare(existingRecord);
      Object.assign(existingRecord, updatedData as any);
      const after = this.serializeChecklistForCompare(existingRecord);
      if (before === after) {
        return Promise.resolve();
      }
      return db.checklist.put(existingRecord).then(() => undefined);
    });
  }

  changeRemark(val: any) {
    this.loop = false;
    this.actionUpdateChecklist();
  }

  repeatLoop() {
    let ind = this.index+1;
    if (this.loop && this.index < this.scheduleArr[0].qus.length - 1) {
      const val = this.scheduleArr[0].qus[ind];
      this.speakCondition(val, ind);
    } else if (ind == this.scheduleArr[0].qus.length) {
      const val: any = {};
      val.tempoutput = 'final';
      val.q_desc_temp = 'All Checklist is Completed, Please Enter Final Remark and Signature, Thankyou';
      this.changeBackground(ind);
      this.speak(val);
    }
  }

  async presentActionSheet(val: any, ind: any) {
    let obj: any = [];
    if (ind !== 1) {
      obj = ['camera']
    } else {
      obj = ['camera', 'gallery'];
    }
    this.camera.selectImage(obj, (blob: Blob) => {
      this.readImg(blob, val)
    });
  }

  async readImg(photo: any, val: any) {
    val.imagename = photo;
    val.attach_ext = '.jpg';
    if (this.questionKind(val) === 'attachment' && val.options?.[0]) {
      val.rspns = val.options[0].optn_id;
    }
    this.actionUpdateChecklist();
    this.repeatLoop();
  }

  pickVideo(val: any) {
    if (this.platform.is('capacitor')) {
      this.captureVideoForQuestion(val);
    } else {
      this.videoPickTarget = val;
      setTimeout(() => this.videoFileInput?.nativeElement?.click(), 0);
    }
  }

  async captureVideoForQuestion(val: any) {
    try {
      const options: CaptureVideoOptions = { limit: 1, quality: 0, duration: 120 };
      const data: any = await this.mediaCapture.captureVideo(options);
      if (data?.[0]?.fullPath) {
        await this.loadVideoPathIntoQuestion(val, data[0].fullPath);
      }
    } catch {
      this.common.presentToast('Video capture cancelled or failed', 'warning');
    }
  }

  async loadVideoPathIntoQuestion(val: any, fullPath: string) {
    this.common.presentLoading().then(() => {});
    try {
      const file = await Filesystem.readFile({ path: fullPath });
      const base64Video = `data:video/mp4;base64,${file.data}`;
      const base64Response = await fetch(base64Video);
      const blob = await base64Response.blob();
      this.applyVideoBlob(val, blob);
    } catch {
      this.common.presentToast('Could not read video file', 'warning');
    } finally {
      this.common.dismissloading();
    }
  }

  onVideoFileSelected(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file && this.videoPickTarget) {
      this.applyVideoBlob(this.videoPickTarget, file);
      this.videoPickTarget = null;
    }
    input.value = '';
  }

  applyVideoBlob(val: any, blob: Blob) {
    val.imagename = blob;
    val.attach_ext = '.mp4';
    if (val.options?.[0]) {
      val.rspns = val.options[0].optn_id;
    }
    val.isNotFill = false;
    this.actionUpdateChecklist();
    this.repeatLoop();
  }

  viewAttachment(val: any) {
    if (!(val.imagename instanceof Blob)) {
      this.viewDocs(val.imagename, val.imagename_blob_tyep);
      return;
    }
    if (this.questionKind(val) === 'video') {
      if (this.videoObjectUrl) {
        URL.revokeObjectURL(this.videoObjectUrl);
      }
      this.videoObjectUrl = URL.createObjectURL(val.imagename);
      this.videoPreviewOpen = true;
    } else {
      this.openPhotoViewer(val.imagename);
    }
  }

  closeVideoPreview() {
    this.videoPreviewOpen = false;
    if (this.videoObjectUrl) {
      URL.revokeObjectURL(this.videoObjectUrl);
      this.videoObjectUrl = '';
    }
  }

  /**
   * Server expects every question answer under `rspns` (same as option questions).
   * UI still uses q_value for scalars / imagename for files — this maps a clone for submit only.
   */
  private buildPayloadForFinalSubmit(root: any): any {
    return {
      ...root,
      qus: (root.qus || []).map((q: any) => this.mapQuestionForSubmitPayload({ ...q })),
    };
  }

  private mapQuestionForSubmitPayload(q: any): any {
    const k = this.questionKind(q);
    if (k === 'option') {
      return q;
    }
    if (k === 'date' || k === 'datetime' || k === 'number' || k === 'temperature') {
      if (q.q_value != null && q.q_value !== '') {
        q.rspns = q.q_value;
      }
      delete q.q_value;
      return q;
    }
    if (k === 'attachment' || k === 'video') {
      if (q.options?.[0]?.optn_id != null) {
        q.rspns = q.options[0].optn_id;
      }
      return q;
    }
    return q;
  }

  convertToFormData(data: any, formData?: FormData, parentKey?: string): FormData {
    formData = formData || new FormData();
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        if (key === 'attach_ext') {
          continue;
        }
        const value = data[key];
        const currentKey = parentKey ? `${parentKey}[${key}]` : key;
        const randomBase = Date.now() + Math.floor(Math.random() * 90000) + 10000;
        if (value instanceof File || (value instanceof Blob && typeof value !== 'string')) {
          const ext = key === 'imagename' && (data as any).attach_ext ? (data as any).attach_ext : '.jpg';
          formData.append(currentKey, value, randomBase + ext);
        } else if (Array.isArray(value)) {
          value.forEach((arrayItem, index) => {
            const arrayItemKey = `${currentKey}[${index}]`;
            this.convertToFormData(arrayItem, formData, arrayItemKey);
          });
        } else if (typeof value === 'object' && value !== null) {
          this.convertToFormData(value, formData, currentKey);
        } else {
          formData.append(currentKey, value);
        }
      }
    }
    return formData;
  }

  submitAction() {
    this.scheduleArr[0].offline_save = 'false'
    const payload = this.buildPayloadForFinalSubmit(this.scheduleArr[0]);
    const formData = this.convertToFormData(payload);
    formData.forEach((value, key) => {
      const display =
        value instanceof Blob
          ? `[Blob type=${(value as Blob).type || 'n/a'} size=${value.size}]`
          : value;
      console.log('[finalSubmit FormData]', key, display);
    });
    this.common.presentLoading().then(preLoad => {
      this.httpDigital.finalSubmitCheckList(formData).subscribe({
        next:(data) => {
          if (data.status) {
            this.common.presentToast(data.msg, 'success');
            this.common.setHomeLoadStatus(true);
            this.scheduleArr[0].schedule_status = 'attended'
            this.actionUpdateChecklist();
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

  validateQuestionAt(index: number, q: any): boolean {
    const k = this.questionKind(q);
    const needRemark = () => q.isRemarkMandatory == 1 && !String(q.remark || '').trim();

    const fail = (msg: string, useOk = false) => {
      q.isNotFill = true;
      this.scroll(index);
      if (useOk) {
        this.common.presentToastWithOk(msg, 'warning');
      } else {
        this.common.presentToast(msg, 'warning');
      }
      return false;
    };

    if (k === 'option') {
      if (!q.rspns) {
        return fail(`Please add Response for Question No ${index + 1}`, true);
      }
      if (needRemark()) {
        return fail(`Please Add Remark for Question No ${index + 1}`);
      }
      if (q.isDocMandatory == 1 && !q.imagename) {
        return fail(`Please Add Attachment for Question No ${index + 1}`);
      }
      q.isNotFill = false;
      return true;
    }

    if (k === 'attachment' || k === 'video') {
      if (q.isDocMandatory == 1 && !q.imagename) {
        return fail(`Please add ${k === 'video' ? 'video' : 'photo'} for Question No ${index + 1}`);
      }
      if (q.options?.[0]) {
        q.rspns = q.options[0].optn_id;
      }
      if (needRemark()) {
        return fail(`Please Add Remark for Question No ${index + 1}`);
      }
      q.isNotFill = false;
      return true;
    }

    if (!this.hasScalarAnswer(q)) {
      return fail(`Please fill answer for Question No ${index + 1}`, true);
    }
    if ((k === 'number' || k === 'temperature') && !this.isNumberInRange(q)) {
      return fail(`Enter a valid value in allowed range for Question No ${index + 1}`);
    }
    if (q.options?.[0]) {
      q.rspns = q.options[0].optn_id;
    }
    if (needRemark()) {
      return fail(`Please Add Remark for Question No ${index + 1}`);
    }
    if (q.isDocMandatory == 1 && !q.imagename) {
      return fail(`Please Add Attachment for Question No ${index + 1}`);
    }
    q.isNotFill = false;
    return true;
  }

  finalSubmit() {
    this.remarkErr = false;
    if (!this.remark) {
      this.common.presentToast('Remark is Required', 'warning');
      this.remarkErr = true;
      return;
    }
    if (!this.signatureBase64) {
      this.common.presentToast('Please Write Signature', 'warning');
      return;
    }
    for (let i = 0; i < this.scheduleArr.length; i++) {
      for (let j = 0; j < this.scheduleArr[i].qus.length; j++) {
        if (!this.validateQuestionAt(j, this.scheduleArr[i].qus[j])) {
          return;
        }
      }
    }
    this.scheduleArr[0].final_remark = this.remark;
    this.scheduleArr[0].base64_sign = this.signatureBase64;
    this.scheduleArr[0].fill_date_time = moment().format('YYYY-MM-DD H:mm:ss');
    this.scheduleArr[0].submitted_date = moment().format('YYYY-MM-DD H:mm:ss');
    this.scheduleArr[0].user = this.userData.user_name
    this.common.checkInternet().then(res => {
      if (res) {
        this.submitAction()
      } else {
        this.common.presentToast('Internet not Working Your Checklist Saved in Local Db', 'tertiary');
        this.scheduleArr[0].offline_save = 'true'
        this.common.setHomeLoadStatus(true);
        this.actionUpdateChecklist();
        this.navCtrl.pop();
      }
    });
  }

  scroll(indexFound: any) {
    setTimeout(() => {
      const userToScrollOn: any = this.itemlist.toArray();
      userToScrollOn[indexFound].nativeElement.scrollIntoView({
        behavior: 'smooth'
      }, (err: any) => {
      });
    }, 500);
  }

  async viewSign() {
    if (this.signatureBase64.startsWith('uploads/')) {
      this.common.setImageCondition(this.signatureBase64, 'blob', 'PRIVATE');
    } else {
      this.common.imageView(this.signatureBase64, '');
    }
  }

  async openSign() {
    const modal = await this.modalCtrl.create({
      component: SignatureComponent,
      cssClass: 'my-modal',
      componentProps: {  }
    });
    modal.onWillDismiss().then(async disModal => {
      if (disModal.role) {
        let random = Date.now() + Math.floor(Math.random() * 90000) + 10000 + '.jpg';
        this.signatureBase64 = disModal.data;
      }
    });
    modal.present();
  }

  changeLan(lang: string) {
    var question: any = [], temp: any, options;
    temp = this.scheduleArr[0].qus;
    for (var i = 0 ; i < temp.length; i++) {
      question.push(temp[i].q_desc);
    }
    question.push('yes');
    question.push('no');
    question.push('not applicable');
    this.translate(question, lang);
  }

  // translate(data: any, lang: string) {
  //   this.common.presentLoading().then(preLoad => {
  //     this.httpDigital.googleTranslate(data, lang).subscribe({
  //       next:(translateText) => {
  //         const optionArr = translateText.data.translations.slice(-3);
  //         for (var i = 0 ; i < this.scheduleArr.length;i++) {
  //           for (var j = 0 ; j < this.scheduleArr[i].qus.length; j++) {
  //             this.scheduleArr[i].qus[j].q_desc = translateText.data.translations[j].translatedText
  //             if (lang == 'en') {
  //               this.scheduleArr[i].qus[j].options[0].optn_desc = 'Yes';
  //               this.scheduleArr[i].qus[j].options[1].optn_desc = 'No';
  //               this.scheduleArr[i].qus[j].options[2].optn_desc = 'NA';
  //             } else {
  //               this.scheduleArr[i].qus[j].options[0].optn_desc = optionArr[0].translatedText;
  //               this.scheduleArr[i].qus[j].options[1].optn_desc = optionArr[1].translatedText;
  //               this.scheduleArr[i].qus[j].options[2].optn_desc = optionArr[2].translatedText;
  //             }
  //           }
  //         }
  //         this.selectedLanguage = lang;
  //       },
  //       error:(err) => {
  //         this.common.dismissloading();
  //         this.common.presentToast(environment.errMsg, 'warning');
  //       },
  //       complete:() => {
  //         this.common.dismissloading();
  //       }
  //     })
  //   });
  // }

  translate(data: any, lang: string) {
    this.common.presentLoading().then(preLoad => {
      this.httpDigital.googleTranslate(data, lang).subscribe({
        next: (translateText) => {
          const optionArr = translateText.data.translations.slice(-3); // Last 3 translations = Yes, No, NA
          for (let i = 0; i < this.scheduleArr.length; i++) {
            for (let j = 0; j < this.scheduleArr[i].qus.length; j++) {
              this.scheduleArr[i].qus[j].q_desc = translateText.data.translations[j].translatedText;

              if (this.scheduleArr[i].qus[j].options?.length) {
                this.scheduleArr[i].qus[j].options.forEach((opt: any) => {
                  // Check the original value (case-insensitive) and set translation
                  if (lang === 'en') {
                    if (opt.optn_value.toLowerCase() === 'yes') opt.optn_desc = 'Yes';
                    if (opt.optn_value.toLowerCase() === 'no') opt.optn_desc = 'No';
                    if (opt.optn_value.toLowerCase() === 'na') opt.optn_desc = 'NA';
                  } else {
                    if (opt.optn_value.toLowerCase() === 'yes') opt.optn_desc = optionArr[0].translatedText;
                    if (opt.optn_value.toLowerCase() === 'no') opt.optn_desc = optionArr[1].translatedText;
                    if (opt.optn_value.toLowerCase() === 'na') opt.optn_desc = optionArr[2].translatedText;
                  }
                });
              }
            }
          }
          this.selectedLanguage = lang;
        },
        error: () => {
          this.common.dismissloading();
          this.common.presentToast(environment.errMsg, 'warning');
        },
        complete: () => {
          this.common.dismissloading();
        }
      });
    });
  }

  viewDocs(obj: any, blobType: string) {
    let type = typeof(obj);
    if(type === 'object') {
      this.openPhotoViewer(obj);
    } else {
      if (!this.isInternet) {
        this.common.presentToast('Internet Not Working', 'warning');
        return;
      }
      this.common.setImageCondition(obj, 'blob', blobType)
    }
  }

  async openPhotoViewer(blob: Blob) {
    const modal = await this.modalCtrl.create({
      component: PhotoViewComponent,
      cssClass: 'my-modal',
      componentProps: {
        blobFile: blob
      }
    });
    modal.onWillDismiss().then(async disModal => {
      if (disModal.role) {

      }
    });
    modal.present();
  }


  changeBackground(ind: any) {
    for (var i = 0; i < this.scheduleArr.length;i++) {
      for (var j = 0 ; j < this.scheduleArr[i].qus.length;j++) {
        if (ind == j) {
          this.scheduleArr[i].qus[j].bgcolor = true;
        } else {
          this.scheduleArr[i].qus[j].bgcolor = false;
        }
      }
    }
  }

  async presentAlertConfirm() {
    const alert = await this.alertController.create({
      cssClass: 'my-custom-class',
      header: 'Create Ticket',
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
          text: 'Submit',
          handler: (dat) => {
            if(dat.remark){
              const obj = {
                source: environment.source,
                remark: dat.remark,
                schedule_id: this.schedule_id

              }
              this.actionTicket(obj);
            } else {
              this.common.presentToast('Please Enter Remarks', 'warning');
            }
          }
        }]
    });
    await alert.present();
  }

  actionTicket(obj: any) {
    let remark = 'Issue raised against this scheduled ID # '+ this.scheduleArr[0].schedule_unique_id + ' Remark -' + obj.remark;
    const formData = {
      remark: remark,
      barcode:"",
      category:1,
      is_barcode:"",
      issue_id:2,
      priority:'medium',
      source: obj.source,
      subcat1_id: 0,
      subcat2_id: 0,
      mobile: this.userData.mobile,
      email: this.userData.email,
      pc_id: this.scheduleArr[0].pc_id,
      req_type_id:4,
      loc_code: this.scheduleArr[0].loc_id,
      wo_id: this.scheduleArr[0].schedule_id
    }
    this.actionComplaint(formData);
  }

  actionComplaint(formData: any) {
    this.common.presentLoading().then(preLoad => {
      this.httpComplaint.createTicketAction(formData).subscribe({
        next:(data) => {
          if (data.status) {
            const fData = {
              wo_id: this.scheduleArr[0].schedule_id,
              ticketid: data.ticket_id
            }
            this.ticketMsg = data.msg;
            this.updateTicket(fData);
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

  updateTicket(formData: any) {
    this.common.presentLoading().then(preLoad => {
      this.httpDigital.updateTktToSchedule(formData).subscribe({
        next:(data) => {
          if (data.status) {
            this.scheduleArr[0].ticket_id = formData.ticketid;
            this.actionUpdateChecklist();
            this.common.presentToast(this.ticketMsg, 'success');
          } else {
            this.common.presentToast(data.msg, 'warning');
          }
        },
        error:() => {
          this.common.dismissloading();
          this.common.presentToast(environment.errMsg + ' Err: Ticket Update API', 'danger');
        },
        complete:() => {
          this.common.dismissloading();
        }
      });
    })

  }
}
