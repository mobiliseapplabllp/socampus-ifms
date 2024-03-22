import { Component, ElementRef, OnInit, QueryList, ViewChildren } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LoadingController, ModalController, NavController, Platform } from '@ionic/angular';
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
  signatureBase64!: string;
  schedule_status: any;
  sign_attachment: any;
  on_behalf: any;
  remarkErr = false;
  arr: any = [];
  selectedLanguage =  'en';
  index: any;
  loop = false;
  isInternet!:boolean;
  constructor(
    private activeRoute: ActivatedRoute,
    private httpDigital: DigitalChecklistService,
    private common: CommonService,
    private navCtrl: NavController,
    private loadingController: LoadingController,
    private modalCtrl: ModalController,
    private platform: Platform,
  ) { }

  ngOnInit() {
    console.log(moment().format('YYYY-MM-DD H:mm:ss'));
    this.common.checkInternet().then(res => {
      if (res) {
        this.isInternet = true;
      } else {
        this.isInternet = false;
      }
    });
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
        this.schedule_status = this.scheduleArr[0].schedule_status
        this.remark =this.scheduleArr[0].final_remark;
        this.signatureBase64 =this.scheduleArr[0].base64_sign;
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

  // getScheduleQuestion() {
  //   this.presentLoading().then(preLoad => {
  //     this.httpDigital.getScheduleQuestion(this.schedule_id).subscribe({
  //       next:(data) => {
  //         if (data.status) {
  //           this.arr = data.data;
  //           this.scheduleArr = data.data.categories;
  //           this.checkListUniqeId = data.data.schedule_unique_id;
  //           this.schedule_status = data.data.schedule_status;
  //           this.cc_desc = data.data.ccName;
  //           this.pc_location = data.data.location_desc
  //           if (!data.data.isUpdate) {
  //             this.common.presentToastWithOk('You can not fill the checklist, before the scheduled time.', 'warning');
  //             this.navCtrl.pop();
  //             return;
  //           }
  //           if (this.schedule_status == 'attended' || this.schedule_status == '2') {
  //             this.remark = data.data.sign_remark;
  //             this.sign_attachment = data.data.sign_attachment
  //           }
  //           this.scheduleArr.forEach((element: any) => {
  //             element.isResponseShow = true;
  //             element.qus.forEach((el: any) => {
  //               if(el.response) {
  //                 el.remark = el.response.remark;
  //                 el.attachment = el.response.attachment1;
  //                 if(el.q_type == '226') {
  //                   el.rspns = el.response.optn_id;
  //                   if (el.rspns) {
  //                     const obj = el.options.filter((val: any) => val.optn_id === el.rspns)[0];
  //                     el.isRemarkMandatory = obj.is_rmrk_mandatory;
  //                     el.isDocMandatory = obj.is_doc_mandatory;
  //                   }
  //                 } else {
  //                   el.rspns = el.response.rspns;
  //                 }
  //               } else {
  //                 el.response = {}
  //               }
  //             })
  //           });
  //         } else {
  //           this.common.presentToast(data.msg, 'warning');
  //         }
  //       },error:()=> {
  //         this.common.presentToast(environment.errMsg, 'danger');
  //         this.dismissloading();
  //       },complete:() => {
  //         this.dismissloading();
  //       }
  //     })
  //   })
  // }

  speakCondition(val: any, ind: any) {
    this.index = ind;
    val.tempoutput = 'response';
    this.loop = true;
    val.bgcolor = true;
    val.q_desc_temp = val.q_desc
    // if (!this.platform.is('capacitor')) {
    //   this.listenAction(val, 'No');
    //   return;
    // }

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
    return db.checklist
    .where('schedule_id')
    .equals(scheduleUniqueId)
    .first()
    .then((existingRecord) => {
      if (existingRecord) {
        Object.assign(existingRecord, updatedData);
        return db.checklist.put(existingRecord);
      } else {
        throw new Error('Record not found');
      }
    });
  }

  // submitResponseAction(obj: any, val: any) {
  //   this.presentLoading().then(preLoad => {
  //     this.httpDigital.scheduleResponseAction(obj).subscribe({
  //       next:(data) => {
  //         if (data.status) {
  //           this.common.presentToast(data.msg, 'success');
  //           const obj = val.options.filter((val1: any) => val1.optn_id === val.rspns)[0];
  //           val.response.optn_id = val.rspns;
  //           val.isRemarkMandatory = obj.is_rmrk_mandatory;
  //           val.isDocMandatory = obj.is_doc_mandatory;
  //           if (val.isRemarkMandatory && val.speak) {
  //             val.tempoutput = 'remark';
  //             val.q_desc_temp = 'Please Speak Remark';
  //             this.scroll(this.index);
  //             this.speak(val);
  //           } else if (!val.isRemarkMandatory && val.speak) {
  //             this.repeatLoop();
  //           }
  //         } else if(data.status == false) {
  //           this.common.presentToast(data.msg, 'warning');
  //         } else {
  //           this.common.presentToast('Unknown Response From Server', 'dark');
  //         }
  //       },
  //       error:() => {
  //         this.dismissloading();
  //         this.common.presentToast(environment.errMsg, 'danger');
  //       },
  //       complete:() => {
  //         this.dismissloading();
  //       }
  //     })
  //   })
  // }

  changeRemark(val: any) {
    this.loop = false;
    this.actionUpdateChecklist();
  }

  // submitRemark(obj: any) {
  //   this.presentLoading().then(preLoad => {
  //     this.httpDigital.schuleRemarkAction(obj).subscribe({
  //       next:(data) => {
  //         if (data.status) {
  //           this.common.presentToast(data.msg , 'success');
  //           if (this.loop) {
  //             const tmp = this.scheduleArr[0].qus[this.index];
  //             if (tmp.isDocMandatory) {
  //               tmp.tempoutput = 'document';
  //               tmp.q_desc_temp = 'Please Upload Photo';
  //               this.scroll(this.index);
  //               this.speak(tmp);
  //             } else {
  //               this.repeatLoop();
  //             }
  //           }
  //         } else if (data.status == false){
  //           this.common.presentToast(data.msg , 'warning');
  //         } else {
  //           this.common.presentToast('Unknown Response From Server' , 'dark');
  //         }
  //       },
  //       error:() => {
  //         this.dismissloading();
  //         this.common.presentToast(environment.errMsg, 'danger');
  //       },
  //       complete:() => {
  //         this.dismissloading();
  //       }
  //     })
  //   });
  // }

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
    var obj: any = {
      quality: 80,
      allowEditing: false,
      resultType: CameraResultType.Uri,
    }
    if (ind !== 1) {
      obj.source = CameraSource.Camera
    }
    const takePicture = async () => {
    const image = await Camera.getPhoto(obj);
    this.readImg(image, val)
    };
    takePicture();
  }

  async readImg(photo: any, val: any) {
    let random = Date.now() + Math.floor(Math.random() * 90000) + 10000 + '.jpg'
    const response = await fetch(photo.webPath);
    const blob = await response.blob();
    val.imagename = blob;
    this.actionUpdateChecklist();
    this.repeatLoop();
    return;
    let formData = new FormData();
    formData.append('wo_id', this.schedule_id);
    formData.append('q_id',  val.q_id);
    formData.append('rspns_source', environment.source);
    formData.append('attachment2', blob, random);
    formData.append('on_behalf', this.on_behalf);
    val.imagename = '';
    this.presentLoading().then(preLoad => {
      this.httpDigital.scheduleDocAction(formData).subscribe({
        next:(data) => {
          if (data.status) {
            this.common.presentToast(data.msg, 'success');
            val.imagename = 'Uploaded';
            this.repeatLoop();
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
    });
  }

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

  testSubmit() {
    this.scheduleArr[0].offline_save = 'false'
    const formData = this.convertToFormData(this.scheduleArr[0]);
    this.presentLoading().then(preLoad => {
      this.httpDigital.finalSubmitCheckList(formData).subscribe({
        next:(data) => {
          if (data.status) {
            this.common.presentToast(data.msg, 'success');
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
    this.scheduleArr[0].base64_sign = this.signatureBase64
    this.common.checkInternet().then(res => {
      if (res) {
        this.testSubmit()
      } else {
        this.common.presentToast('Internet not Working Your Checklist Saved in Local Db', 'tertiary');
        this.scheduleArr[0].fill_date_time = moment().format('YYYY-MM-DD H:mm:ss');
        this.scheduleArr[0].offline_save = 'true'
        this.actionUpdateChecklist();
        this.navCtrl.pop();
      }
    });
    return;

    const obj = {
      status: 2,
      wo_id: this.schedule_id,
      source: environment.source,
      signattachment: this.signatureBase64,
      signremark: this.remark,
      on_behalf: this.on_behalf,
    };
    for (let i = 0; i < this.scheduleArr.length; i++) {
      if (this.scheduleArr[i].is_applicable != 3) {
        for (let j = 0; j < this.scheduleArr[i].qus.length; j++) {
          if (!this.scheduleArr[i].qus[j].rspns) {
            this.common.presentToastWithOk(`Please add Response for Question No ${ j + 1} from Category ${ this.scheduleArr[i].cat_desc }`, 'warning');
            this.scheduleArr[i].qus[j].isNotFill = true;
            this.scheduleArr[i].isResponseShow = true;
            this.scroll(j);
            return;
          } else {
            this.scheduleArr[i].qus[j].isNotFill = false;
          }
        }
      }
    }
    this.presentLoading().then(preLoad => {
      this.httpDigital.finalSubmitCheckList(obj).subscribe({
        next:(data) => {
          if (data.status) {
            this.common.presentToast(data.msg, 'success');
            this.navCtrl.pop();
          } else {
            this.common.presentToastWithOk(data.msg, 'warning');
            if (data.cat_head && data.cat_ques) {
              // this.scrollCategory(data);
            } else {
              console.log('cat not found');
            }
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
    });
  }

  scroll(indexFound: any) {
    setTimeout(() => {
      const userToScrollOn: any = this.itemlist.toArray();
      userToScrollOn[indexFound].nativeElement.scrollIntoView({
        behavior: 'smooth'
      }, (err: any) => {
        console.log(err);
      });
    }, 500);
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

  viewDocs(url: any) {
    console.log(url);
    this.common.openDoc(url);
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
}
