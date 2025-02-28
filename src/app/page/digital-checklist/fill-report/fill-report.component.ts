import { Component, ElementRef, OnInit, QueryList, ViewChildren } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AlertController, LoadingController, ModalController, NavController, Platform } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { DigitalChecklistService } from 'src/app/provider/digital-checklist/digital-checklist.service';
import { SignatureComponent } from 'src/app/shared/signature/signature.component';
import { environment } from 'src/environments/environment';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { SpeechRecognition } from "@capacitor-community/speech-recognition";
import { checklist, db } from '../../../provider/local-db/local-db.service';
import { liveQuery } from 'dexie';
import * as moment from 'moment';
import { PhotoViewComponent } from 'src/app/shared/photo-view/photo-view.component';
import { ComplaintService } from 'src/app/provider/complaint/complaint.service';
import { CameraService } from 'src/app/provider/camera/camera.service';
@Component({
  selector: 'app-fill-report',
  templateUrl: './fill-report.component.html',
  styleUrls: ['./fill-report.component.scss'],
})
export class FillReportComponent  implements OnInit {
  @ViewChildren("a") private itemlist!: QueryList<ElementRef>;
  temp:any = [];
  scheduleArr1$ = liveQuery(() => this.getScheuleFromLocal());
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
  constructor(
    private activeRoute: ActivatedRoute,
    private httpDigital: DigitalChecklistService,
    private common: CommonService,
    private navCtrl: NavController,
    private loadingController: LoadingController,
    private modalCtrl: ModalController,
    private platform: Platform,
    private alertController: AlertController,
    private httpComplaint: ComplaintService,
    private cameraService: CameraService
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
    this.activeRoute.queryParams.subscribe((res) => {
      this.on_behalf = res['isOnBehalf'];
      this.schedule_id = parseInt(res['schedule_id'], 10) ;
    });

    if (this.platform.is('capacitor')) {
      SpeechRecognition.checkPermissions().then(res => {
        if (res.speechRecognition === 'granted') {
          return
        } else {
          this.permission();
        }
      });
    }

    this.temp = this.scheduleArr1$.subscribe({
      next:(data) => {
        this.scheduleArr = [...data];
        console.log(this.scheduleArr);
        this.schedule_status = this.scheduleArr[0].schedule_status
        this.remark =this.scheduleArr[0].final_remark;
        this.signatureBase64 =this.scheduleArr[0].base64_sign;
        this.offline_save = this.scheduleArr[0].offline_save
      },
    });


    setTimeout(() => {
      this.temp.unsubscribe();
    }, 1000)
  }

  async getScheuleFromLocal() {
    return await db.checklist.where({schedule_id: this.schedule_id}).toArray();
  }

  ionViewDidLeave() {
    this.loop = false;
    this.removeListen();
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

  speakCondition(val: any, ind: any) {
    this.index = ind;
    val.tempoutput = 'response';
    this.loop = true;
    val.bgcolor = true;
    val.q_desc_temp = val.q_desc

    const isLanguageSupported = async (lang: string) => {
      const isSupported = await TextToSpeech.isLanguageSupported({ lang });
      if (isSupported.supported === false) {
        this.common.presentToastWithOk('Please Select Google Preferred engine. go to Setting and Search "Text-to-speech output" then select "Preferred engine" and select "Speech Recognition and Synthesis"', 'warning');
      } else {
        this.changeBackground(ind);
        this.scroll(ind);
        this.speak(val);
      }
    };
    if (this.platform.is('capacitor')) {
      isLanguageSupported(this.selectedLanguage);
    } else {
      this.changeBackground(ind);
      this.scroll(ind);
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
          this.presentActionSheet(val, 2);
        } else if (val.tempoutput === 'final') {
          return;
        } else {
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
    }).then(res => {
      let voiceResponse, voiceResponseTemp: any;
      voiceResponseTemp = res.matches[0];
      if (this.selectedLanguage == 'en' || val.tempoutput === 'remark') {
        voiceResponse = res.matches[0].toLocaleLowerCase();
        this.listenAction(val, voiceResponse);
      } else {
        this.presentLoading('Translate String to  English Language').then(preLoad => {
          this.httpDigital.googleTranslate([voiceResponseTemp], 'en').subscribe({
            next:(translateText) => {
              voiceResponse = translateText.data.translations[0].translatedText;
              this.listenAction(val, voiceResponse);
            },
            error:() => {
              this.common.presentToast(environment.errMsg, 'danger');
              this.dismissloading();
            },
            complete:() => {
              this.dismissloading();
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
        tmp.q_desc_temp = 'Please Upload Photo';
        this.scroll(this.index);
        this.speak(tmp);
      } else {
        this.repeatLoop();
      }
      this.actionUpdateChecklist();
    } else if (val.tempoutput === 'document') {
      this.presentActionSheet(val, 2);
    }
  }

  changeResponseAction(val: any) {
    if (val.rspns && val.rspns === val.rspns_temp) {
      return;
    }
    const obj = val.options.filter((val1: any) => val1.optn_id === val.rspns)[0];
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
    const updatedData: Partial<checklist> = this.scheduleArr[0];
    this.updateCheckList(this.schedule_id, updatedData);
  }

  updateCheckList(scheduleUniqueId: number, updatedData: Partial<checklist>) {
    return db.checklist.where('schedule_id').equals(scheduleUniqueId).first().then((existingRecord) => {
      if (existingRecord) {
        Object.assign(existingRecord, updatedData);
        return db.checklist.put(existingRecord);
      } else {
        throw new Error('Record not found');
      }
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

  presentActionSheet(val: any, ind: any) {
    let obj: any = [];
    if (ind !== 1) {
      obj = ['camera'];
    } else {
      obj = ['camera', 'gallery'];
    }
    this.cameraService.selectImage(obj, (blob: any) => {
      val.imagename = blob;
      this.actionUpdateChecklist();
      this.repeatLoop();
    });
  }

  // async presentActionSheet(val: any, ind: any) {
  //   var obj: any = {
  //     quality: 80,
  //     allowEditing: false,
  //     resultType: CameraResultType.Uri,
  //   }
  //   if (ind !== 1) {
  //     obj.source = CameraSource.Camera
  //   }
  //   const takePicture = async () => {
  //   const image = await Camera.getPhoto(obj);
  //   this.readImg(image, val)
  //   };
  //   takePicture();
  // }

  // async readImg(photo: any, val: any) {
  //   let random = Date.now() + Math.floor(Math.random() * 90000) + 10000 + '.jpg'
  //   const response = await fetch(photo.webPath);
  //   const blob = await response.blob();
  //   val.imagename = blob;
  //   this.actionUpdateChecklist();
  //   this.repeatLoop();
  // }

  convertToFormData(data: any, formData?: FormData, parentKey?: string): FormData {
    formData = formData || new FormData();
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        const value = data[key];
        const currentKey = parentKey ? `${parentKey}[${key}]` : key;
        let random = Date.now() + Math.floor(Math.random() * 90000) + 10000 + '.jpg'
        if (value instanceof File || (value instanceof Blob && typeof value !== 'string')) {
          formData.append(currentKey, value, random);
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
    const formData = this.convertToFormData(this.scheduleArr[0]);
    this.presentLoading().then(preLoad => {
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
          this.dismissloading();
          this.common.presentToast(environment.errMsg, 'danger');
        },
        complete:() => {
          this.dismissloading();
        }
      });
    })
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
        if (!this.scheduleArr[i].qus[j].rspns) {
          this.common.presentToastWithOk(`Please add Response for Question No ${ j + 1}`, 'warning');
          this.scheduleArr[i].qus[j].isNotFill = true;
          this.scroll(j);
          return
        } else {
          if (this.scheduleArr[i].qus[j].isRemarkMandatory == 1 && !this.scheduleArr[i].qus[j].remark) {
            this.common.presentToast(`Please Add Remark for Question No ${j+1}`, 'warning');
            this.scheduleArr[i].qus[j].isNotFill = true;
            this.scroll(j);
            return;
          } else if(this.scheduleArr[i].qus[j].isDocMandatory == 1 && !this.scheduleArr[i].qus[j].imagename) {
            this.common.presentToast(`Please Add Attachment for Question No ${j+1}`, 'warning');
            this.scheduleArr[i].qus[j].isNotFill = true;
            this.scroll(j);
            return;
          } else {
            this.scheduleArr[i].qus[j].isNotFill = false;
          }
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

  translate(data: any, lang: string) {
    this.presentLoading().then(preLoad => {
      this.httpDigital.googleTranslate(data, lang).subscribe({
        next:(translateText) => {
          const optionArr = translateText.data.translations.slice(-3);
          for (var i = 0 ; i < this.scheduleArr.length;i++) {
            for (var j = 0 ; j < this.scheduleArr[i].qus.length; j++) {
              this.scheduleArr[i].qus[j].q_desc = translateText.data.translations[j].translatedText
              if (lang == 'en') {
                this.scheduleArr[i].qus[j].options[0].optn_desc = 'Yes';
                this.scheduleArr[i].qus[j].options[1].optn_desc = 'No';
                this.scheduleArr[i].qus[j].options[2].optn_desc = 'NA';
              } else {
                this.scheduleArr[i].qus[j].options[0].optn_desc = optionArr[0].translatedText;
                this.scheduleArr[i].qus[j].options[1].optn_desc = optionArr[1].translatedText;
                this.scheduleArr[i].qus[j].options[2].optn_desc = optionArr[2].translatedText;
              }
            }
          }
          this.selectedLanguage = lang;
        },
        error:(err) => {
          this.dismissloading();
          this.common.presentToastWithOk(JSON.stringify(err), 'warning');
        },
        complete:() => {
          this.dismissloading();
        }
      })
    });
  }

  async presentLoading(msg?: string) {
    let message;
    if (!msg) {
      message = 'Please Wait...';
    } else {
      message = msg
    }
    this.loading = await this.loadingController.create({
      cssClass: 'my-custom-class',
      message: message,
      duration: 20000
    });
    await this.loading.present();
  }

  async dismissloading() {
    if (this.loading) {
      this.loading.dismiss();
    }
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
    this.presentLoading().then(preLoad => {
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
          this.dismissloading();
          this.common.presentToast(environment.errMsg, 'danger');
        },
        complete:() => {
          this.dismissloading();
        }
      })
    })
  }

  updateTicket(formData: any) {
    this.presentLoading().then(preLoad => {
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
          this.dismissloading();
          this.common.presentToast(environment.errMsg + ' Err: Ticket Update API', 'danger');
        },
        complete:() => {
          this.dismissloading();
        }
      });
    })

  }
}
