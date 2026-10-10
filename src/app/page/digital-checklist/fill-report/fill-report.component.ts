import { Component, ElementRef, NgZone, OnDestroy, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { MediaCapture, CaptureVideoOptions } from '@awesome-cordova-plugins/media-capture/ngx';
import { Filesystem } from '@capacitor/filesystem';
import { ActivatedRoute } from '@angular/router';
import { AlertController, ModalController, NavController, Platform, ViewWillEnter } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import * as moment from 'moment';
import { CommonService } from 'src/app/provider/common/common.service';
import { DigitalChecklistService } from 'src/app/provider/digital-checklist/digital-checklist.service';
import { ComplaintService } from 'src/app/provider/complaint/complaint.service';
import { CameraService } from 'src/app/provider/camera/camera.service';
import { SignatureComponent } from 'src/app/shared/signature/signature.component';
import { PhotoViewComponent } from 'src/app/shared/photo-view/photo-view.component';
import { environment } from 'src/environments/environment';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { checklist, db } from '../../../provider/local-db/local-db.service';

export type QuestionKind =
  | 'option'
  | 'video'
  | 'attachment'
  | 'date'
  | 'datetime'
  | 'number'
  | 'temperature'
  | 'shorttext';

/** Server par submit ki hui response files isi folder me rehti hain (jaise `imagename` / `base64_sign` me aata hai). */
const RESPONSE_FILE_DIR = 'uploads/pms_cal/checklist_response_images/';

const Q_TYPE_TO_KIND: Record<string, QuestionKind> = {
  '315': 'video',
  '225': 'attachment',
  '229': 'date',
  '313': 'datetime',
  '227': 'number',
  '316': 'number',
  '314': 'temperature',
  '308': 'shorttext',
  '226': 'option',
};

export interface I18nLabels {
  fillReports: string;
  pcName: string;
  location: string;
  checklistId: string;
  checklist: string;
  scheduleDate: string;
  attendedDate: string;
  reviewDate: string;
  submitBy: string;
  raiseTicket: string;
  ticketId: string;
  enterValue: string;
  temperature: string;
  allowedRange: string;
  date: string;
  dateTime: string;
  selectDate: string;
  selectDateTime: string;
  yourAnswer: string;
  enterRemark: string;
  remark: string;
  photo: string;
  video: string;
  img: string;
  signature: string;
  viewSignature: string;
  submit: string;
  close: string;
  yes: string;
  no: string;
  na: string;
}

const I18N_LABELS: Record<string, I18nLabels> = {
  en: {
    fillReports: 'Fill Reports',
    pcName: 'PC Name',
    location: 'Location',
    checklistId: 'CheckList ID',
    checklist: 'CheckList',
    scheduleDate: 'Schedule Date',
    attendedDate: 'Attended Date',
    reviewDate: 'Review Date',
    submitBy: 'Submit By',
    raiseTicket: 'Raise a Ticket',
    ticketId: 'Ticket ID',
    enterValue: 'Enter value',
    temperature: 'Temperature',
    allowedRange: 'Allowed range',
    date: 'Date',
    dateTime: 'Date & time',
    selectDate: 'Select Date',
    selectDateTime: 'Select date & time',
    yourAnswer: 'Your answer',
    enterRemark: 'Enter Remark',
    remark: 'Remark',
    photo: 'Photo',
    video: 'Video',
    img: 'IMG',
    signature: 'Signature',
    viewSignature: 'View Signature',
    submit: 'Submit',
    close: 'Close',
    yes: 'Yes',
    no: 'No',
    na: 'NA',
  },
  hi: {
    fillReports: 'रिपोर्ट भरें',
    pcName: 'पीसी नाम',
    location: 'स्थान',
    checklistId: 'चेकलिस्ट आईडी',
    checklist: 'चेकलिस्ट',
    scheduleDate: 'निर्धारित तिथि',
    attendedDate: 'उपस्थित तिथि',
    reviewDate: 'समीक्षा तिथि',
    submitBy: 'द्वारा प्रस्तुत',
    raiseTicket: 'टिकट बनाएं',
    ticketId: 'टिकट आईडी',
    enterValue: 'मान दर्ज करें',
    temperature: 'तापमान',
    allowedRange: 'अनुमत सीमा',
    date: 'तिथि',
    dateTime: 'तिथि और समय',
    selectDate: 'तिथि चुनें',
    selectDateTime: 'तिथि और समय चुनें',
    yourAnswer: 'आपका उत्तर',
    enterRemark: 'टिप्पणी दर्ज करें',
    remark: 'टिप्पणी',
    photo: 'फोटो',
    video: 'वीडियो',
    img: 'चित्र',
    signature: 'हस्ताक्षर',
    viewSignature: 'हस्ताक्षर देखें',
    submit: 'जमा करें',
    close: 'बंद करें',
    yes: 'हाँ',
    no: 'नहीं',
    na: 'लागू नहीं',
  },
  te: {
    fillReports: 'నివేదికలు నింపండి',
    pcName: 'పీసీ పేరు',
    location: 'స్థానం',
    checklistId: 'చెక్‌లిస్ట్ ID',
    checklist: 'చెక్‌లిస్ట్',
    scheduleDate: 'షెడ్యూల్ తేదీ',
    attendedDate: 'హాజరైన తేదీ',
    reviewDate: 'సమీక్ష తేదీ',
    submitBy: 'సమర్పించినవారు',
    raiseTicket: 'టికెట్ సృష్టించండి',
    ticketId: 'టికెట్ ID',
    enterValue: 'విలువ నమోదు చేయండి',
    temperature: 'ఉష్ణోగ్రత',
    allowedRange: 'అనుమతించిన పరిధి',
    date: 'తేదీ',
    dateTime: 'తేదీ & సమయం',
    selectDate: 'తేదీని ఎంచుకోండి',
    selectDateTime: 'తేదీ & సమయాన్ని ఎంచుకోండి',
    yourAnswer: 'మీ సమాధానం',
    enterRemark: 'వ్యాఖ్య నమోదు చేయండి',
    remark: 'వ్యాఖ్య',
    photo: 'ఫోటో',
    video: 'వీడియో',
    img: 'చిత్రం',
    signature: 'సంతకం',
    viewSignature: 'సంతకం చూడండి',
    submit: 'సమర్పించండి',
    close: 'మూసివేయండి',
    yes: 'అవును',
    no: 'కాదు',
    na: 'వర్తించదు',
  },
  ta: {
    fillReports: 'அறிக்கைகளை நிரப்பவும்',
    pcName: 'பிசி பெயர்',
    location: 'இடம்',
    checklistId: 'சரிபார்ப்புப் பட்டியல் ID',
    checklist: 'சரிபார்ப்புப் பட்டியல்',
    scheduleDate: 'திட்டமிடப்பட்ட தேதி',
    attendedDate: 'கலந்துகொண்ட தேதி',
    reviewDate: 'மதிப்பாய்வு தேதி',
    submitBy: 'சமர்ப்பித்தவர்',
    raiseTicket: 'டிக்கெட் உருவாக்கு',
    ticketId: 'டிக்கெட் ID',
    enterValue: 'மதிப்பை உள்ளிடவும்',
    temperature: 'வெப்பநிலை',
    allowedRange: 'அனுமதிக்கப்பட்ட வரம்பு',
    date: 'தேதி',
    dateTime: 'தேதி & நேரம்',
    selectDate: 'தேதியைத் தேர்ந்தெடுக்கவும்',
    selectDateTime: 'தேதி & நேரத்தைத் தேர்ந்தெடுக்கவும்',
    yourAnswer: 'உங்கள் பதில்',
    enterRemark: 'குறிப்பை உள்ளிடவும்',
    remark: 'குறிப்பு',
    photo: 'புகைப்படம்',
    video: 'வீடியோ',
    img: 'படம்',
    signature: 'கையொப்பம்',
    viewSignature: 'கையொப்பத்தைப் பார்க்கவும்',
    submit: 'சமர்ப்பி',
    close: 'மூடு',
    yes: 'ஆம்',
    no: 'இல்லை',
    na: 'பொருந்தாது',
  },
  kn: {
    fillReports: 'ವರದಿಗಳನ್ನು ಭರ್ತಿ ಮಾಡಿ',
    pcName: 'ಪಿಸಿ ಹೆಸರು',
    location: 'ಸ್ಥಳ',
    checklistId: 'ಪರಿಶೀಲನಾ ಪಟ್ಟಿ ID',
    checklist: 'ಪರಿಶೀಲನಾ ಪಟ್ಟಿ',
    scheduleDate: 'ನಿಗದಿತ ದಿನಾಂಕ',
    attendedDate: 'ಹಾಜರಾದ ದಿನಾಂಕ',
    reviewDate: 'ವಿಮರ್ಶೆ ದಿನಾಂಕ',
    submitBy: 'ಸಲ್ಲಿಸಿದವರು',
    raiseTicket: 'ಟಿಕೆಟ್ ರಚಿಸಿ',
    ticketId: 'ಟಿಕೆಟ್ ID',
    enterValue: 'ಮೌಲ್ಯವನ್ನು ನಮೂದಿಸಿ',
    temperature: 'ತಾಪಮಾನ',
    allowedRange: 'ಅನುಮತಿಸಲಾದ ವ್ಯಾಪ್ತಿ',
    date: 'ದಿನಾಂಕ',
    dateTime: 'ದಿನಾಂಕ & ಸಮಯ',
    selectDate: 'ದಿನಾಂಕ ಆಯ್ಕೆಮಾಡಿ',
    selectDateTime: 'ದಿನಾಂಕ & ಸಮಯ ಆಯ್ಕೆಮಾಡಿ',
    yourAnswer: 'ನಿಮ್ಮ ಉತ್ತರ',
    enterRemark: 'ಟಿಪ್ಪಣಿ ನಮೂದಿಸಿ',
    remark: 'ಟಿಪ್ಪಣಿ',
    photo: 'ಫೋಟೋ',
    video: 'ವೀಡಿಯೊ',
    img: 'ಚಿತ್ರ',
    signature: 'ಸಹಿ',
    viewSignature: 'ಸಹಿಯನ್ನು ನೋಡಿ',
    submit: 'ಸಲ್ಲಿಸಿ',
    close: 'ಮುಚ್ಚಿ',
    yes: 'ಹೌದು',
    no: 'ಇಲ್ಲ',
    na: 'ಅನ್ವಯಿಸುವುದಿಲ್ಲ',
  },
  ml: {
    fillReports: 'റിപ്പോർട്ടുകൾ പൂരിപ്പിക്കുക',
    pcName: 'പിസി പേര്',
    location: 'സ്ഥലം',
    checklistId: 'ചെക്ക്‌ലിസ്റ്റ് ID',
    checklist: 'ചെക്ക്‌ലിസ്റ്റ്',
    scheduleDate: 'ഷെഡ്യൂൾ തീയതി',
    attendedDate: 'ഹാജരായ തീയതി',
    reviewDate: 'അവലോകന തീയതി',
    submitBy: 'സമർപ്പിച്ചത്',
    raiseTicket: 'ടിക്കറ്റ് സൃഷ്ടിക്കുക',
    ticketId: 'ടിക്കറ്റ് ID',
    enterValue: 'മൂല്യം നൽകുക',
    temperature: 'താപനില',
    allowedRange: 'അനുവദനീയ പരിധി',
    date: 'തീയതി',
    dateTime: 'തീയതി & സമയം',
    selectDate: 'തീയതി തിരഞ്ഞെടുക്കുക',
    selectDateTime: 'തീയതി & സമയം തിരഞ്ഞെടുക്കുക',
    yourAnswer: 'നിങ്ങളുടെ ഉത്തരം',
    enterRemark: 'അഭിപ്രായം നൽകുക',
    remark: 'അഭിപ്രായം',
    photo: 'ഫോട്ടോ',
    video: 'വീഡിയോ',
    img: 'ചിത്രം',
    signature: 'ഒപ്പ്',
    viewSignature: 'ഒപ്പ് കാണുക',
    submit: 'സമർപ്പിക്കുക',
    close: 'അടയ്ക്കുക',
    yes: 'അതെ',
    no: 'അല്ല',
    na: 'ബാധകമല്ല',
  },
  mr: {
    fillReports: 'अहवाल भरा',
    pcName: 'पीसी नाव',
    location: 'स्थान',
    checklistId: 'चेकलिस्ट आयडी',
    checklist: 'चेकलिस्ट',
    scheduleDate: 'नियोजित तारीख',
    attendedDate: 'उपस्थित तारीख',
    reviewDate: 'पुनरावलोकन तारीख',
    submitBy: 'द्वारा सादर',
    raiseTicket: 'तिकीट तयार करा',
    ticketId: 'तिकीट आयडी',
    enterValue: 'मूल्य प्रविष्ट करा',
    temperature: 'तापमान',
    allowedRange: 'अनुमत श्रेणी',
    date: 'तारीख',
    dateTime: 'तारीख आणि वेळ',
    selectDate: 'तारीख निवडा',
    selectDateTime: 'तारीख आणि वेळ निवडा',
    yourAnswer: 'तुमचे उत्तर',
    enterRemark: 'टिप्पणी प्रविष्ट करा',
    remark: 'टिप्पणी',
    photo: 'फोटो',
    video: 'व्हिडिओ',
    img: 'प्रतिमा',
    signature: 'स्वाक्षरी',
    viewSignature: 'स्वाक्षरी पहा',
    submit: 'सबमिट करा',
    close: 'बंद करा',
    yes: 'होय',
    no: 'नाही',
    na: 'लागू नाही',
  },
  gu: {
    fillReports: 'અહેવાલો ભરો',
    pcName: 'પીસી નામ',
    location: 'સ્થાન',
    checklistId: 'ચેકલિસ્ટ ID',
    checklist: 'ચેકલિસ્ટ',
    scheduleDate: 'નિર્ધારિત તારીખ',
    attendedDate: 'હાજર રહેલી તારીખ',
    reviewDate: 'સમીક્ષા તારીખ',
    submitBy: 'દ્વારા સબમિટ',
    raiseTicket: 'ટિકિટ બનાવો',
    ticketId: 'ટિકિટ ID',
    enterValue: 'મૂલ્ય દાખલ કરો',
    temperature: 'તાપમાન',
    allowedRange: 'મંજૂર શ્રેણી',
    date: 'તારીખ',
    dateTime: 'તારીખ અને સમય',
    selectDate: 'તારીખ પસંદ કરો',
    selectDateTime: 'તારીખ અને સમય પસંદ કરો',
    yourAnswer: 'તમારો જવાબ',
    enterRemark: 'ટિપ્પણી દાખલ કરો',
    remark: 'ટિપ્પણી',
    photo: 'ફોટો',
    video: 'વિડિઓ',
    img: 'છબી',
    signature: 'સહી',
    viewSignature: 'સહી જુઓ',
    submit: 'સબમિટ કરો',
    close: 'બંધ કરો',
    yes: 'હા',
    no: 'ના',
    na: 'લાગુ નથી',
  },
  bn: {
    fillReports: 'রিপোর্ট পূরণ করুন',
    pcName: 'পিসি নাম',
    location: 'অবস্থান',
    checklistId: 'চেকলিস্ট ID',
    checklist: 'চেকলিস্ট',
    scheduleDate: 'নির্ধারিত তারিখ',
    attendedDate: 'উপস্থিত তারিখ',
    reviewDate: 'পর্যালোচনা তারিখ',
    submitBy: 'জমাদানকারী',
    raiseTicket: 'টিকিট তৈরি করুন',
    ticketId: 'টিকিট ID',
    enterValue: 'মান লিখুন',
    temperature: 'তাপমাত্রা',
    allowedRange: 'অনুমোদিত পরিসীমা',
    date: 'তারিখ',
    dateTime: 'তারিখ ও সময়',
    selectDate: 'তারিখ নির্বাচন করুন',
    selectDateTime: 'তারিখ ও সময় নির্বাচন করুন',
    yourAnswer: 'আপনার উত্তর',
    enterRemark: 'মন্তব্য লিখুন',
    remark: 'মন্তব্য',
    photo: 'ছবি',
    video: 'ভিডিও',
    img: 'চিত্র',
    signature: 'স্বাক্ষর',
    viewSignature: 'স্বাক্ষর দেখুন',
    submit: 'জমা দিন',
    close: 'বন্ধ করুন',
    yes: 'হ্যাঁ',
    no: 'না',
    na: 'প্রযোজ্য নয়',
  },
  or: {
    fillReports: 'ରିପୋର୍ଟ ପୂରଣ କରନ୍ତୁ',
    pcName: 'ପିସି ନାମ',
    location: 'ସ୍ଥାନ',
    checklistId: 'ଚେକଲିଷ୍ଟ ID',
    checklist: 'ଚେକଲିଷ୍ଟ',
    scheduleDate: 'ନିର୍ଧାରିତ ତାରିଖ',
    attendedDate: 'ଉପସ୍ଥିତ ତାରିଖ',
    reviewDate: 'ସମୀକ୍ଷା ତାରିଖ',
    submitBy: 'ଦ୍ୱାରା ଦାଖଲ',
    raiseTicket: 'ଟିକେଟ୍ ସୃଷ୍ଟି କରନ୍ତୁ',
    ticketId: 'ଟିକେଟ୍ ID',
    enterValue: 'ମୂଲ୍ୟ ପ୍ରବେଶ କରନ୍ତୁ',
    temperature: 'ତାପମାତ୍ରା',
    allowedRange: 'ଅନୁମତିପ୍ରାପ୍ତ ପରିସର',
    date: 'ତାରିଖ',
    dateTime: 'ତାରିଖ ଏବଂ ସମୟ',
    selectDate: 'ତାରିଖ ବାଛନ୍ତୁ',
    selectDateTime: 'ତାରିଖ ଏବଂ ସମୟ ବାଛନ୍ତୁ',
    yourAnswer: 'ଆପଣଙ୍କ ଉତ୍ତର',
    enterRemark: 'ଟିପ୍ପଣୀ ପ୍ରବେଶ କରନ୍ତୁ',
    remark: 'ଟିପ୍ପଣୀ',
    photo: 'ଫଟୋ',
    video: 'ଭିଡିଓ',
    img: 'ଚିତ୍ର',
    signature: 'ଦସ୍ତଖତ',
    viewSignature: 'ଦସ୍ତଖତ ଦେଖନ୍ତୁ',
    submit: 'ଦାଖଲ କରନ୍ତୁ',
    close: 'ବନ୍ଦ କରନ୍ତୁ',
    yes: 'ହଁ',
    no: 'ନା',
    na: 'ପ୍ରଯୁଜ୍ୟ ନୁହେଁ',
  },
};

@Component({
  selector: 'app-fill-report',
  templateUrl: './fill-report.component.html',
  styleUrls: ['./fill-report.component.scss'],
})
export class FillReportComponent implements OnInit, OnDestroy, ViewWillEnter {
  @ViewChildren('a') private itemlist!: QueryList<ElementRef>;
  @ViewChild('videoFileInput') videoFileInput!: ElementRef<HTMLInputElement>;

  /** All HTTP / rxjs subscriptions created during this page's life. Disposed on leave/destroy. */
  private readonly activeSubs: Subscription[] = [];
  /** All setTimeout handles so we can cancel them on leave/destroy. */
  private readonly pendingTimers: any[] = [];

  /** Language picker — keeps template a single *ngFor */
  readonly uiLangs: { code: string; label: string }[] = [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'Hindi' },
    { code: 'te', label: 'Telugu' },
    { code: 'ta', label: 'Tamil' },
    { code: 'kn', label: 'Kannada' },
    { code: 'ml', label: 'Malayalam' },
    { code: 'mr', label: 'Marathi' },
    { code: 'gu', label: 'Gujarati' },
    { code: 'bn', label: 'Bengali' },
    { code: 'or', label: 'Odia' },
  ];

  private readonly ttsEngineHint =
    'Please Select Google Preferred engine. go to Setting and Search "Text-to-speech output" then select "Preferred engine" and select "Speech Recognition and Synthesis"';

  /** Blocks Dexie writes while UI applies a Dexie snapshot (avoids ionChange → update loops during hydrate). */
  private applyingDbSnapshot = false;
  scheduleArr: any = [];
  schedule_id: any;
  remark: any;
  signatureBase64!: any;
  /**
   * Sirf dikhane ke liye. `signatureBase64` me asli cheez jaati hai (sign karte hi Blob,
   * server se aayi hui checklist me "uploads/..." wala path) - us par seedha [src] nahi
   * lag sakta, isliye preview alag rakhte hain.
   */
  signaturePreview: SafeUrl | string | null = null;
  /** Blob se bana URL - page chhodte waqt chhodna padta hai, warna memory pakde rehti hai */
  private signatureObjectUrl: string | null = null;
  schedule_status: any;
  on_behalf: any;
  remarkErr = false;
  selectedLanguage = 'en';
  /** Pehli baar ka English q_desc, flat order me - taaki language switch par double translate na ho. */
  originalQDesc: string[] = [];
  i18nLabels: I18nLabels = I18N_LABELS['en'];
  index: any;
  loop = false;
  isInternet = false;
  offline_save!: string;
  userData: any = {};
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
    private ngZone: NgZone,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit() {
    this.common.checkInternet().then(online => {
      this.isInternet = !!online;
    });
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      this.userData = JSON.parse(storedUser);
    }
    if (this.platform.is('capacitor')) {
      SpeechRecognition.checkPermissions().then(res => {
        if (res.speechRecognition !== 'granted') {
          this.permission();
        }
      });
    }
  }
  
  async ionViewWillEnter() {
    const qp = this.activeRoute.snapshot.queryParamMap;
    this.on_behalf = qp.get('isOnBehalf') ?? this.on_behalf;
    const rawSid = qp.get('schedule_id');
    this.schedule_id = rawSid != null && rawSid !== '' ? parseInt(rawSid, 10) : NaN;
    await this.hydrateChecklistFromDexieOnce();
    this.tryAutoFillFromPreviousChecklist();
  }

  /** Text-only auto-fill from earlier checklist of same category. Skips attachment/video. */
  private tryAutoFillFromPreviousChecklist() {
    if (!this.scheduleArr?.length) {
      return;
    }
    if (!this.isEditable()) {
      return;
    }
    const root = this.scheduleArr[0];
    const payload = {
      scheduler_id: root.scheduler_id ?? '',
      schedule_id: root.schedule_id ?? '',
      checklist_cat_id: root.checklist_cat_id ?? root.cat_id ?? '',
    };
    this.trackSub(
      this.httpDigital.getAutoFillData(payload).subscribe({
        next: (res: any) => {
          if (res?.status && Array.isArray(res.data) && res.data.length) {
            this.applyAutoFillResponse(res.data);
          }
        },
        error: () => { /* silent — leave checklist blank */ }
      })
    );
  }

  private applyAutoFillResponse(data: Array<{ q_id: any; q_type: any; rspns: any; remark: any }>) {
    if (!this.scheduleArr?.[0]?.qus) {
      return;
    }
    const map = new Map(data.map(d => [String(d.q_id), d]));
    this.scheduleArr[0].qus.forEach((q: any) => {
      const prev = map.get(String(q.q_id));
      if (!prev) {
        return;
      }
      const k = this.questionKind(q);
      if (k === 'attachment' || k === 'video') {
        return;
      }
      if (k === 'date' || k === 'datetime' || k === 'number' || k === 'temperature' || k === 'shorttext') {
        q.q_value = prev.rspns ?? '';
        if (q.options?.[0] && q.q_value !== '') {
          q.rspns = q.options[0].optn_id;
        }
      } else if (k === 'option') {
        const needle = String(prev.rspns ?? '').trim().toLowerCase();
        const opt = q.options?.find((o: any) =>
          String(o.optn_desc ?? '').trim().toLowerCase() === needle ||
          String(o.optn_value ?? '').trim().toLowerCase() === needle
        );
        if (opt) {
          q.rspns = opt.optn_id;
          q.rspns_temp = opt.optn_id;
          q.isRemarkMandatory = opt.is_rmrk_mandatory;
          q.isDocMandatory = opt.is_doc_mandatory;
        }
      }
      if (prev.remark) {
        q.remark = prev.remark;
      }
      q.isNotFill = false;
    });
    this.applyingDbSnapshot = false;
    this.actionUpdateChecklist();
  }

  private async hydrateChecklistFromDexieOnce() {
    if (this.schedule_id == null || Number.isNaN(this.schedule_id)) {
      this.scheduleArr = [];
      this.applyingDbSnapshot = false;
      return;
    }
    const data = await this.getScheduleFromLocal();
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
    console.log(this.scheduleArr);
    this.scheduleArr[0].qus?.forEach((q: any) => {
      this.syncNonOptionMandatory(q);
      this.applyServerResponseToUi(q);
      this.syncOptionResponseTempAfterLoad(q);
    });
    this.schedule_status = this.scheduleArr[0].schedule_status;
    this.remark = this.scheduleArr[0].final_remark;
    this.signatureBase64 = this.scheduleArr[0].base64_sign;
    this.setSignaturePreview(this.signatureBase64);
    this.offline_save = this.scheduleArr[0].offline_save;
    this.trackSub(
      this.ngZone.onStable.pipe(take(1)).subscribe(() => {
        queueMicrotask(() => {
          this.applyingDbSnapshot = false;
        });
      })
    );
  }

  /**
   * Reverse of `mapQuestionForSubmitPayload()`.
   * Server har question ka jawab `rspnsval` me lautata hai aur `rspns` null bhejta hai, jabki UI
   * scalars ko `q_value`, options ko `rspns` aur file ko `imagename` se bind karti hai. Ye mapping
   * na ho to submit ki hui (attended/closed) checklist View karne par saare jawab blank dikhte hain.
   * Sirf khaali UI field bharta hai - offline me locally bhari checklist ka data chhedta nahi.
   */
  private applyServerResponseToUi(q: any) {
    const answer = q?.rspnsval;
    if (answer === null || answer === undefined || answer === '') {
      return;
    }
    const kind = this.questionKind(q);
    if (kind === 'date' || kind === 'datetime' || kind === 'number' || kind === 'temperature' || kind === 'shorttext') {
      if (q.q_value == null || q.q_value === '') {
        q.q_value = answer;
      }
      return;
    }
    if (kind === 'attachment' || kind === 'video') {
      if (!q.imagename) {
        q.imagename = this.toServerFilePath(answer);
        q.imagename_blob_tyep = q.imagename_blob_tyep || 'PRIVATE';
      }
      return;
    }
    if (q.rspns != null && q.rspns !== '') {
      return;
    }
    // option: server optn_id bhej sakta hai ya optn_value/optn_desc - teeno se match kara lete hain
    const needle = String(answer).trim().toLowerCase();
    const opt = (q.options || []).find((o: any) =>
      String(o.optn_id ?? '').trim().toLowerCase() === needle ||
      String(o.optn_value ?? '').trim().toLowerCase() === needle ||
      String(o.optn_desc ?? '').trim().toLowerCase() === needle
    );
    if (opt) {
      q.rspns = opt.optn_id;
    }
  }

  /** `rspnsval` sirf filename deta hai; `imagename`/`base64_sign` jaisa poora server path bana dete hain. */
  private toServerFilePath(name: any): string {
    const value = String(name);
    return value.includes('/') ? value : RESPONSE_FILE_DIR + value;
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

  async getScheduleFromLocal() {
    return await db.checklist.where({ schedule_id: this.schedule_id }).toArray();
  }

  ionViewDidLeave() {
    this.loop = false;
    this.removeListen();
    this.closeVideoPreview();
    this.disposeAll();
    TextToSpeech.stop().catch(() => { /* safe noop */ });
  }

  ngOnDestroy() {
    this.disposeAll();
    this.closeVideoPreview();
  }

  /** Track an RxJS subscription so it gets torn down on leave/destroy. */
  private trackSub(sub: Subscription): Subscription {
    this.activeSubs.push(sub);
    return sub;
  }

  /** Wrap setTimeout so the handle is cancelled automatically on leave/destroy. */
  private scheduleTimer(fn: () => void, delayMs: number): any {
    const id = setTimeout(() => {
      this.pendingTimers.splice(this.pendingTimers.indexOf(id), 1);
      fn();
    }, delayMs);
    this.pendingTimers.push(id);
    return id;
  }

  private disposeAll() {
    this.activeSubs.forEach(sub => {
      if (sub && !sub.closed) {
        sub.unsubscribe();
      }
    });
    this.activeSubs.length = 0;

    this.pendingTimers.forEach(id => clearTimeout(id));
    this.pendingTimers.length = 0;

    this.releaseSignatureObjectUrl();
  }

  removeListen() {
    SpeechRecognition.removeAllListeners();
  }

  permission() {
    SpeechRecognition.requestPermissions().catch(() => { /* user denied */ });
  }

  /** Assigned checklist + not offline-locked */
  isEditable(dat?: any): boolean {
    const status = dat?.schedule_status ?? this.schedule_status;
    return status === 'assigned' && this.offline_save !== 'true';
  }

  /** UI + validation: map API question_type / q_type */
  questionKind(val: any): QuestionKind {
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
    if (t.includes('short text')) {
      return 'shorttext';
    }
    if (t.includes('decimal') || (t.includes('number') && !t.includes('phone'))) {
      return 'number';
    }
    if (t.includes('option')) {
      return 'option';
    }
    const qt = String(val?.q_type ?? '');
    return Q_TYPE_TO_KIND[qt] ?? 'option';
  }

  numericScalarLabel(val: any): string {
    return this.questionKind(val) === 'temperature' ? this.i18nLabels.temperature : this.i18nLabels.enterValue;
  }

  onDocPick(val: any, mode: 'photo' | 'video' | 'img'): void {
    if (mode === 'video') {
      this.pickVideo(val);
    } else {
      this.presentActionSheet(val, 1);
    }
  }

  docPickLabel(mode: 'photo' | 'video' | 'img'): string {
    return mode === 'photo' ? this.i18nLabels.photo : mode === 'video' ? this.i18nLabels.video : this.i18nLabels.img;
  }

  docPickIconPending(mode: 'photo' | 'video' | 'img'): string {
    return mode === 'photo' ? 'camera-outline' : mode === 'video' ? 'videocam-outline' : 'attach-outline';
  }

  docPickRedBorder(val: any, mode: 'photo' | 'video' | 'img'): boolean {
    if (!val.imagename && val.isDocMandatory === 1) {
      return mode === 'img' ? true : !!val.isNotFill;
    }
    return false;
  }

  viewIconForDocMode(mode: 'photo' | 'video' | 'img'): string {
    return mode === 'img' ? 'attach-outline' : 'eye-outline';
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
    this.scheduleArr.forEach((row: any) => {
      (row.qus || []).forEach((q: any) => { q.bgcolor = false; });
    });
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
    if (this.questionKind(val) === 'temperature') {
      return '';
    }
    const r = this.parseNumericRange(val);
    if (!r) {
      return '';
    }
    return `${this.i18nLabels.allowedRange}: ${r.min} – ${r.max}`;
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
    if (k === 'number') {
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
            this.common.presentToastWithOk(this.ttsEngineHint, 'warning');
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
        this.common.presentToastWithOk(this.ttsEngineHint, 'warning');
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
          this.trackSub(
            this.httpDigital.aiStudioTranslate(voiceResponseTemp, 'en').subscribe({
              next:(translateText) => {
                voiceResponse = translateText;
                this.listenAction(val, voiceResponse);
              },
              error:() => {
                this.common.presentToast(environment.errMsg, 'danger');
                this.common.dismissloading();
              },
              complete:() => {
                this.common.dismissloading();
              }
            })
          );
        });
      }
    });
  }

  listenAction(val: any, voiceResponseTemp: any) {
    let respns: any;
    let option: any;
    const voiceResponse = String(voiceResponseTemp).toLowerCase();
    if (!val.tempoutput || val.tempoutput === 'response') {
      if (this.questionKind(val) !== 'option') {
        return;
      }
      const yes = /^(yes|yess|yeees|yaaa|ha)$/;
      const no = /^(no|nooo)$/;
      const na = /^(n a|na|not applicable|not app)$/;
      if (yes.test(voiceResponse)) {
        option = val.options.find((ops: any) => ops.optn_value === 'Yes');
        respns = option?.optn_id;
      } else if (no.test(voiceResponse)) {
        option = val.options.find((ops: any) => ops.optn_value === 'No');
        respns = option?.optn_id;
      } else if (na.test(voiceResponse)) {
        option = val.options.find((ops: any) => ops.optn_value === 'NA');
        respns = option?.optn_id;
      } else {
        val.tempoutput = 'response';
        val.q_desc_temp = 'We Accept Only yes, no and Not Applicable';
        this.speak(val);
        return;
      }
      if (!option) {
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

  actionUpdateChecklist() {
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
      this.scheduleTimer(() => this.videoFileInput?.nativeElement?.click(), 0);
    }
  }

  async captureVideoForQuestion(val: any) {
    try {
      const options: CaptureVideoOptions = { limit: 1, quality: 0, duration: 90 };
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
    this.uploadVideoIfOnline(val, blob);
    this.repeatLoop();
  }

  private uploadVideoIfOnline(val: any, blob: Blob) {
    this.common.checkInternet().then((online) => {
      if (!online) {
        return;
      }
      const formData = new FormData();
      formData.append('schedule_id', String(this.schedule_id));
      formData.append('q_id', String(val.q_id));
      formData.append('cat_id', String(val.cat_id));
      const fileName = `${Date.now()}${val.attach_ext || '.mp4'}`;
      formData.append('video', blob, fileName);

      val.video_uploading = true;
      this.trackSub(
        this.httpDigital.saveVideoResponse(formData).subscribe({
          next: (data: any) => {
            val.video_uploading = false;
            if (data?.status) {
              // Server-side filename (e.g. "vid_57476_1452_..mp4") — sent as `rspns` on final submit.
              val.uploaded_attachment = data?.data?.attachment || '';
              val.imagename = 'already_upload';
              this.actionUpdateChecklist();
              this.common.presentToast(data?.msg || 'Video uploaded successfully', 'success');
            } else {
              this.common.presentToast(data?.msg || 'Video upload failed, kept offline', 'warning');
            }
          },
          error: () => {
            val.video_uploading = false;
            this.common.presentToast('Video upload failed, will retry on submit', 'warning');
          }
        })
      );
    });
  }

  viewAttachment(val: any) {
    if (val.imagename === 'already_upload') {
      this.common.presentToast('Video uploaded to server', 'success');
      return;
    }
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
    if (k === 'date' || k === 'datetime' || k === 'number' || k === 'temperature' || k === 'shorttext') {
      if (q.q_value != null && q.q_value !== '') {
        q.rspns = q.q_value;
      }
    } else if (k === 'attachment' || k === 'video') {
      // Attachment/Video questions: the file itself is the answer, so send it under `rspns`
      // and do NOT carry `imagename` (which is reserved for the optional extra IMG row on other types).
      // If the file was already uploaded via saveVideoResponse, submit the server-returned filename
      // instead of re-uploading the Blob.
      if (q.uploaded_attachment) {
        q.rspns = q.uploaded_attachment;
      } else {
        q.rspns = q.imagename;
      }
    }
    const trimmed: any = {
      q_desc: q.q_desc,
      q_id: q.q_id,
      q_type: q.q_type,
      question_type: q.question_type,
      cat_id: q.cat_id,
      q_max_score: q.q_max_score,
      remark: q.remark,
      rspns: q.rspns,
    };
    // Non file-type questions may still carry an optional extra attachment in `imagename`.
    if (k !== 'attachment' && k !== 'video') {
      trimmed.imagename = q.imagename;
    }
    if (q.attach_ext != null) {
      trimmed.attach_ext = q.attach_ext;
    }
    return trimmed;
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
          const isQuestionFileField = key === 'rspns' || key === 'imagename';
          const ext = isQuestionFileField && (data as any).attach_ext ? (data as any).attach_ext : '.jpg';
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
    this.scheduleArr[0].offline_save = 'false';
    const payload = this.buildPayloadForFinalSubmit(this.scheduleArr[0]);
    const formData = this.convertToFormData(payload);
    this.common.presentLoading().then(preLoad => {
      this.trackSub(
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
        })
      );
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
    this.scheduleTimer(() => {
      const userToScrollOn: any = this.itemlist.toArray();
      userToScrollOn?.[indexFound]?.nativeElement?.scrollIntoView({ behavior: 'smooth' });
    }, 500);
  }

  async viewSign() {
    const sign = this.signatureBase64;
    if (!sign) {
      return;
    }
    // Sign karte hi ye Blob hota hai - us par startsWith chalane se error aata tha
    if (sign instanceof Blob) {
      this.common.imageView('', sign);
      return;
    }
    if (typeof sign === 'string' && sign.startsWith('uploads/')) {
      this.common.setImageCondition(sign, 'blob', 'PRIVATE');
      return;
    }
    this.common.imageView(sign, '');
  }

  async openSign() {
    const modal = await this.modalCtrl.create({
      component: SignatureComponent,
      cssClass: 'my-modal',
      componentProps: {  }
    });
    modal.onWillDismiss().then(async disModal => {
      if (disModal.role) {
        this.signatureBase64 = this.dataUrlToBlob(disModal.data);
        // Modal ka dataURL hi sabse saaf preview hai - Blob se dobara banane ki zaroorat nahi
        this.setSignaturePreview(disModal.data);
      }
    });
    modal.present();
  }

  /**
   * Teen soorat aati hain aur teeno alag hain:
   *   - abhi sign kiya       -> "data:image/png;base64,..." (seedha dikh jaata hai)
   *   - offline saved/Dexie  -> Blob (objectURL banana padta hai)
   *   - submit ho chuki      -> "uploads/..." server ka path (inline nahi dikha sakte,
   *                             uske liye View wala button hai)
   */
  private setSignaturePreview(value: any) {
    this.releaseSignatureObjectUrl();

    if (!value) {
      this.signaturePreview = null;
      return;
    }

    if (typeof value === 'string') {
      this.signaturePreview = value.startsWith('data:') ? value : null;
      return;
    }

    if (value instanceof Blob) {
      this.signatureObjectUrl = URL.createObjectURL(value);
      this.signaturePreview = this.sanitizer.bypassSecurityTrustUrl(this.signatureObjectUrl);
      return;
    }

    this.signaturePreview = null;
  }

  private releaseSignatureObjectUrl() {
    if (this.signatureObjectUrl) {
      URL.revokeObjectURL(this.signatureObjectUrl);
      this.signatureObjectUrl = null;
    }
  }

  private dataUrlToBlob(dataUrl: string): Blob {
    const [meta, b64] = String(dataUrl).split(',');
    const mime = /data:(.*?);base64/.exec(meta)?.[1] || 'image/png';
    const bin = atob(b64);
    const len = bin.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = bin.charCodeAt(i);
    }
    return new Blob([bytes], { type: mime });
  }

  changeLan(lang: string) {
    this.i18nLabels = I18N_LABELS[lang] ?? I18N_LABELS['en'];
    this.applyYesNoNaFromLabels();
    // Saari rows ke q_desc ek hi flat array me, same order me. Isse question kitne bhi ho,
    // translate() usi order me running counter se wapas set kar deta hai.
    const question: string[] = [];
    let qIndex = 0;
    this.scheduleArr.forEach((row: any) => {
      (row.qus || []).forEach((q: any) => {
        // Pehli baar ka English q_desc component ki memory me yaad rakh lete hain. Ye question
        // object par nahi rakha - warna ye field Dexie me bhi save hota aur submit payload me
        // bhi server tak chala jaata.
        if (this.originalQDesc[qIndex] === undefined) {
          this.originalQDesc[qIndex] = q.q_desc;
        }
        if (lang === 'en') {
          // English par original se wapas - koi API call ki zaroorat nahi
          q.q_desc = this.originalQDesc[qIndex];
        } else {
          // hamesha original English text bhejte hain, screen par dikh raha translated text nahi -
          // warna hi -> ta karne par double translation hoti aur quality girti
          question.push(this.originalQDesc[qIndex]);
        }
        qIndex++;
      });
    });
    if (lang === 'en') {
      this.selectedLanguage = lang;
      return;
    }
    this.translate(question, lang);
  }

  private applyYesNoNaFromLabels() {
    this.scheduleArr.forEach((row: any) => {
      (row.qus || []).forEach((q: any) => {
        if (!q.options?.length) {
          return;
        }
        q.options.forEach((opt: any) => {
          const optionValue = String(opt?.optn_value ?? '').toLowerCase();
          if (optionValue === 'yes') {
            opt.optn_desc = this.i18nLabels.yes;
          } else if (optionValue === 'no') {
            opt.optn_desc = this.i18nLabels.no;
          } else if (optionValue === 'na') {
            opt.optn_desc = this.i18nLabels.na;
          }
        });
      });
    });
  }

  translate(data: any, lang: string) { // google se azure (AI Studio) par shift kiya hai
    this.common.presentLoading().then(preLoad => {
      this.trackSub(
        this.httpDigital.aiStudioTranslateBatch(data, lang).subscribe({
          next: (translations) => {
            // aiStudioTranslateBatch same order me string[] deta hai (Google jaisa hi contract).
            // changeLan() ne jis order me push kiya tha, usi order me running counter se wapas
            // read karte hain - isliye indexing hamesha sahi rehti hai.
            let idx = 0;
            this.scheduleArr.forEach((row: any) => {
              (row.qus || []).forEach((q: any) => {
                q.q_desc = translations[idx] ?? q.q_desc;
                idx++;
              });
            });
            this.selectedLanguage = lang;
          },
          error: () => {
            this.common.dismissloading();
            this.common.presentToast(environment.errMsg, 'warning');
          },
          complete: () => {
            this.common.dismissloading();
          }
        })
      );
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
      componentProps: { blobFile: blob }
    });
    modal.present();
  }


  changeBackground(ind: any) {
    this.scheduleArr.forEach((row: any) => {
      (row.qus || []).forEach((q: any, j: number) => { q.bgcolor = j === ind; });
    });
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
      buttons: [
        { text: 'Cancel', handler: () => {} },
        {
          text: 'Submit',
          handler: (dat) => {
            if (dat.remark) {
              this.actionTicket({
                source: environment.source,
                remark: dat.remark,
                schedule_id: this.schedule_id,
              });
            } else {
              this.common.presentToast('Please Enter Remarks', 'warning');
            }
          }
        }
      ]
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
      this.trackSub(
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
      )
    })
  }

  updateTicket(formData: any) {
    this.common.presentLoading().then(preLoad => {
      this.trackSub(
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
        })
      );
    })

  }
}
