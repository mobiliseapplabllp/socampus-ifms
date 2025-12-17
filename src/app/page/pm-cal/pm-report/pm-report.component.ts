import { Component,OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, LoadingController, ModalController, NavController, Platform } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { PmCalService } from 'src/app/provider/pm-cal/pm-cal.service';
import { environment } from 'src/environments/environment';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { SpeechRecognition } from "@capacitor-community/speech-recognition";
import { DigitalChecklistService } from 'src/app/provider/digital-checklist/digital-checklist.service';
import { CameraService } from 'src/app/provider/camera/camera.service';
import { HoldPpmComponent } from '../hold-ppm/hold-ppm.component';
@Component({
  selector: 'app-pm-report',
  templateUrl: './pm-report.component.html',
  styleUrls: ['./pm-report.component.scss'],
})
export class PmReportComponent  implements OnInit {
  requestedData: any = [];
  myCategory: any = [];
  loading: any;
  //  myAssets: any = [];
  selectedLanguage =  'en';
  index!: string;
  rowIndex: any;
  colIndex: any;
  loop = false;
  progress = 0;
  isOpen = false;
  questionList: any = [];
  category: any = [];
  selectedCategory = 0;
  canHoldPpm!: boolean;
  canUnHoldPpm!: boolean;
  actionPermission: any = [];
  constructor(
    private activeroute: ActivatedRoute,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private httpPmCal: PmCalService,
    private httpCommon: CommonService,
    private navCtrl: NavController,
    private common: CommonService,
    private httpDigital: DigitalChecklistService,
    private platform: Platform,
    // private modal: ModalController,
    private router: Router,
    private camera: CameraService,
    private modalCtrl: ModalController,    
    ) {

  }

  ngOnInit() {
    this.activeroute.queryParams.subscribe((res) => {
      this.requestedData = JSON.parse(res['data']);
      console.log(this.requestedData);
    });

    // if (this.platform.is('capacitor')) {
    //   SpeechRecognition.checkPermissions().then(res => {
    //     if (res.speechRecognition === 'granted') {
    //       return
    //     } else {
    //       this.permission();
    //     }
    //   });
    // }
  }

  ionViewDidEnter() {
    this.getScheduleQuestion();
  }

  getCategory(wo_id: any) {
    this.common.presentLoading().then(preLoad => {
      this.httpPmCal.getCategory(wo_id).subscribe({
        next:(data) => {
          if (data.status) {
            this.myCategory = data.data.categories;

            for (var i = 0 ; i < this.myCategory.length; i++) {
              if (this.myCategory[i].is_applicable === 1) { // 3 means NA; 1 = yes
                this.myCategory[i].is_applicable_temp = true;
              } else {
                this.myCategory[i].is_applicable_temp = false;
              }
            }
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

  openQusPage(data: any) {
    if (!data.is_applicable_temp) {
      this.common.presentToast('This category is not Applicable', 'warning');
      return;
    }
    data.wo_no = this.requestedData.wo_no;
    data.wo_id = this.requestedData.wo_id
    data.id = this.requestedData.id;
    this.router.navigate(['/pm-calibration/fill-qus'], {
      queryParams: {
        data: JSON.stringify(data),
      }
    });
  }


  openModal(question: any, category: any) {    
    if (!category.is_applicable) {
      return
    }
    this.isOpen = true;
    this.questionList = question;
    this.category = category
  }

  ionViewWillLeave() {
    this.common.setHomeLoadStatus(true);
  }

  removeListen() {
    SpeechRecognition.removeAllListeners();
  }

  permission() {
    SpeechRecognition.requestPermissions().then(res => {});
  }

  cancel() {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  scrollToDiv(id: string) {
    setTimeout(() => {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth'});
      }
    }, 1000);
  }

  getScheduleQuestion() {
    this.common.presentLoading('Please Wait').then(preLoad => {
      this.httpPmCal.getScheduleQuestion(this.requestedData.id).subscribe({
        next:(data) => {
          this.myCategory = data.data.categories;          
          this.actionPermission = data.action_permissions;
          console.log(this.actionPermission);
          this.myCategory.forEach((element: any) => {
            // element.is_applicable_temp = element.is_applicable === 1 ? true: false; // yeah dheeraj ne hatwai hai kyuki ab sare category bydefault enable hai
            element.is_applicable_temp = true;
            element.total_questions = element.qus.length;
            let total_action = 0, count = 0;
            element.responded_questions = total_action;
            count = count + 1
            if(element.is_applicable === 1) {

            }
            element.qus.forEach((el: any) => {
              if (el.response) {
                total_action = total_action + 1;
                el.rspns = el.response.optn_id;
                el.remark = el.response.remark;
                el.attachment1 = el.response.attachment1;
                element.responded_questions = total_action;
              }
            });
            this.selectedCategory = count
          });          
          this.myCategory = this.myCategory.filter((val: any) => val.total_questions > 0);          
        },
        error:() => {
          this.common.dismissloading();
          this.httpCommon.presentToast(environment.errMsg, 'danger');
        },
        complete:() => {
          this.common.dismissloading();
        }
      });
    });
  }

  async notApplicable(dat: any) {
    const alert = await this.alertController.create({
      header: 'Confirm!!!',
      message: 'Are you sure want to NA "' + dat.cat_desc + '"',
      buttons: [{
        text: 'No',
        handler: (blah) => { }
      }, {
        text: 'YES',
        handler: () => {
          this.submitCategoryAction(dat, 3)
        }
      }]
    });
    await alert.present();
  }

  changeToggle(data: any, ind: any) {    
    if (data.is_applicable_temp === true && data.is_applicable === 1) {
      return;
    }
    data.is_applicable_temp === false ? data.is_applicable = 3: data.is_applicable = 1;
    this.submitCategoryAction(data)
  }

  expand(data: any, ind: any) {
    this.rowIndex = ind;
    this.colIndex = 0;
    this.submitCategoryAction(data, data.is_applicable)
  }

  submitCategoryAction(data: any, is_applicable?: number) {
    const obj = {
      cat_id: data.cat_id,
      is_applicable: data.is_applicable,
      rspns_source: environment.source,
      wo_id: this.requestedData.wo_id,
    };
    this.common.presentLoading('Please Wait..').then(preLoad => {
      this.httpPmCal.checkListCategoryStatus(obj).subscribe({
        next:(dat) => {
          if (dat.status) {
            data.isAssestShow = obj.is_applicable === 1 ? true: false;
            data.isResponseShow = obj.is_applicable === 1 ? true: false;
            data.is_applicable = obj.is_applicable;
            this.httpCommon.presentToast(dat.msg, 'success');
            if (this.loop && obj.is_applicable ==3) {
              if (this.rowIndex < this.myCategory.length - 1) {
                this.rowIndex = this.rowIndex + 1;
                this.colIndex = 0;
                const obj = this.myCategory[this.rowIndex];
                obj.cat_desc_temp = 'Please Response Next Category ' + obj.cat_desc
                this.actionCategory(obj, this.rowIndex, this.colIndex);
              } else {
                const obj = {
                  cat_desc_temp: 'All PMS Completed - Thank You',
                  tempoutput: 'final',
                }
                this.actionCategory(obj, this.rowIndex, this.colIndex);
              }
            } else {
              for (let i = 0; i < this.myCategory.length; i++) {
                if (i !== this.rowIndex) {
                  this.myCategory[i].isView = false;
                }
              }
              this.scrollToDiv(this.rowIndex)
              this.colIndex = 0;
              this.repeatLoop();
            }
          } else {
            this.httpCommon.presentToast(dat.msg, 'warning');
          }
        },
        error:() => {
          this.dismissloading();
          this.httpCommon.presentToast(environment.errMsg, 'danger');
        },
        complete:() => {
          this.dismissloading();
        }
      });
    });
  }

  viewMore(dat: any, ind: any) {
    this.presentLoading('Loading...').then(preLoad => {
      dat.isResponseShow = !dat.isResponseShow;
      if (dat.isResponseShow) {
        this.scrollToDiv(ind);
      }
      setTimeout(() => {
        this.dismissloading();
      }, 1500);
    })
  }

  changeOptionResponse(data: any, ev: any) {
    if (!data.rspns) {
      return;
    }
    if (data.response && data.rspns == data.response.optn_id) {
      return;
    }
    const obj = {
      wo_id: this.requestedData.wo_id,
      rspns: data.rspns,
      q_id: data.q_id,
      q_type: data.q_type,
      q_max_score: data.q_max_score,
      rspns_source: environment.source
    }
    let rspns_count = 0;
    this.category.qus.forEach((element: any) => {
      if (element.response?.optn_id) {
        rspns_count = rspns_count + 1;
        this.category.rspns_count = rspns_count;
      }
    });
    this.category.progress = Math.round(this.category.rspns_count * 100 / this.category.qus.length);
    this.category.progress1 = this.category.progress / 100
    this.submitResponseAction(obj, data)
  }

  submitResponseAction(obj: any, data: any) {
    this.presentLoading('Please Wait').then(preLoad => {
      this.httpPmCal.scheduleResponseAction(obj).subscribe({
        next:(dat) =>{
          if (dat.status) {
            this.httpCommon.presentToast(dat.msg, 'success');
            data.response.optn_id = data.rspns;
            const obj = data.options.filter((val1: any) => val1.optn_id === data.rspns)[0];
            data.is_doc_mandatory = obj.is_doc_mandatory;
            data.is_rmrk_mandatory = obj.is_rmrk_mandatory;
            data.is_correct = obj.is_correct;
            data.isNotFill = false;
            this.colIndex = this.colIndex + 1;
            if (data.is_rmrk_mandatory && data.speak) {
              data.tempoutput = 'remark';
              data.q_desc_temp = 'Please Speak Remark';
              this.speak(data);
            } else if (!data.is_rmrk_mandatory && data.speak) {
              this.repeatLoop();
            }

          } else {
            data.rspns = '';
            this.httpCommon.presentToast(dat.msg, 'warning');
          }
        },
        error:() => {
          data.rspns = '';
          this.dismissloading();
          this.httpCommon.presentToast(environment.errMsg, 'danger');
        },
        complete:() => {
          this.dismissloading();
        }
      });
    });
  }

  changeRemark(data: any) {
    this.loop = false;
    const obj1 = {
      wo_id: this.requestedData.wo_id,
      remark: data.remark,
      q_id: data.q_id,
      rspns_source: environment.source
    };
    this.submitRemarkAction(obj1, data);
  }

  submitRemarkAction(obj1: any, data: any) {
    this.presentLoading('Please Wait..').then(preLoad => {
      this.httpPmCal.scheduleResponseActionRem(obj1).subscribe({
        next:(dat) => {
          if (dat.status) {
            this.httpCommon.presentToast(dat.msg, 'success');
            data.isNotFill = false;
            if (this.loop) {
              if (data.is_doc_mandatory) {
                data.tempoutput = 'document';
                data.q_desc_temp = 'Please Upload Photo';
                this.speak(data);
              } else {
                this.repeatLoop();
              }
            }
          } else {
            this.httpCommon.presentToast(dat.msg, 'warning');
          }
        },
        error:() => {
          this.dismissloading();
          this.httpCommon.presentToast(environment.errMsg, 'warning');
        },
        complete:() => {
          this.dismissloading();
        }
      });
    });
  }

  async presentActionSheet(data: any, ind: any) {
    let obj: any = [];
    if (ind === 1) {
      obj = ['camera', 'gallery'];
    } else {
      obj = ['camera'];
    }
    this.camera.selectImage(obj, (blob) => {
      let random = Date.now() + Math.floor(Math.random() * 90000) + 10000 + '.jpg';
      let formData = new FormData();
      formData.append('wo_id', this.requestedData.wo_id);
      formData.append('q_id',  data.q_id);
      formData.append('rspns_source', environment.source);
      formData.append('attachment2', blob, random);
      data.imagename = '';
      this.presentLoading('Please Wait..').then(preLoad => {
        this.httpPmCal.scheduleResponseActionDoc(formData).subscribe({
          next:(dat) => {
            if (dat.status) {
              data.imagename = 'Uploaded';
              data.isNotFill = false;
              this.httpCommon.presentToast(dat.msg, 'success');
              this.repeatLoop();
            } else {
              this.httpCommon.presentToast(dat.msg, 'warning');
            }
          },
          error:() => {
            this.dismissloading();
            this.httpCommon.presentToast(environment.errMsg, 'danger');
          },
          complete:() => {
            this.dismissloading();
          }
        });
      });
    });
    // var obj: any = {}
    // if (ind === 1) {
    //   obj = {
    //     quality: 80,
    //     allowEditing: false,
    //     resultType: CameraResultType.Uri,
    //   }
    // } else {
    //   obj = {
    //     quality: 80,
    //     allowEditing: false,
    //     resultType: CameraResultType.Uri,
    //     source: CameraSource.Camera,
    //   }
    // }
    // const takePicture = async () => {
    //   const image = await Camera.getPhoto(obj);
    //   this.readImg(image, val)
    // };
    // takePicture();
  }

  // async readImg(photo: any, data: any) {
  //   let random = Date.now() + Math.floor(Math.random() * 90000) + 10000 + '.jpg'
  //   const response = await fetch(photo.webPath);
  //   const blob = await response.blob();
  //   let formData = new FormData();
  //   formData.append('wo_id', this.requestedData.wo_id);
  //   formData.append('q_id',  data.q_id);
  //   formData.append('rspns_source', environment.source);
  //   formData.append('attachment2', blob, random);
  //   data.imagename = '';
  //   this.presentLoading('Please Wait..').then(preLoad => {
  //     this.httpPmCal.scheduleResponseActionDoc(formData).subscribe({
  //       next:(dat) => {
  //         if (dat.status) {
  //           data.imagename = 'Uploaded';
  //           data.isNotFill = false;
  //           this.httpCommon.presentToast(dat.msg, 'success');
  //           this.repeatLoop();
  //         } else {
  //           this.httpCommon.presentToast(dat.msg, 'warning');
  //         }
  //       },
  //       error:() => {
  //         this.dismissloading();
  //         this.httpCommon.presentToast(environment.errMsg, 'danger');
  //       },
  //       complete:() => {
  //         this.dismissloading();
  //       }
  //     });
  //   });
  // }

  finalSubmit() {
    const NACat: any = [];
    for (var i = 0 ; i < this.myCategory.length; i++) {
      if (this.myCategory[i].responded_questions !== this.myCategory[i].total_questions) { // if (this.myCategory[i].is_applicable === 1 && (this.myCategory[i].responded_questions !== this.myCategory[i].total_questions)) {
        this.myCategory[i].isError = true;
        this.common.presentToast(`Please Response all Question for Category ${i+1}`, 'warning');
        return;
      } else if (this.myCategory[i].is_applicable !== 1) {
        NACat.push(this.myCategory[i].cat_id);
      }
    }
    // for (let i = 0; i < this.myCategory.length; i++) {
    //   if (!this.myCategory[i].is_applicable) {
    //     this.httpCommon.presentToastWithOk(`Please Add Response for Category ${i+1} ${this.myCategory[i].cat_desc}` , 'warning');
    //     this.scrollToDiv(i.toString());
    //     return;
    //   }
    //   if (this.myCategory[i].is_applicable != 3) {
    //     for (let j = 0; j < this.myCategory[i].qus.length; j++) {
    //       if (!this.myCategory[i].qus[j].rspns) {
    //         this.httpCommon.presentToastWithOk(`Please add Response for Question No ${ j + 1} from Category ${ this.myCategory[i].cat_desc }`, 'warning');
    //         this.myCategory[i].qus[j].isNotFill = true;
    //         this.myCategory[i].isError = true;
    //         let temp = i+j.toString();;
    //         setTimeout(() => {
    //           this.scrollToDiv(temp);
    //         }, 100);
    //         return;
    //       } else {
    //         this.myCategory[i].isError = false;
    //         this.myCategory[i].qus[j].isNotFill = false;
    //       }
    //     }
    //   }
    // }
    const obj: any = {
      status: 2,
      // wo_id: this.requestedData.wo_id, //yeah hatwai hai backend k hisab se 
      wo_id: this.requestedData.id,
      source: environment.source,
      na_cat: NACat
    };    
    this.presentLoading('Saving Data..').then(preLoad => {
      this.httpPmCal.finalSubmitCheckList(obj).subscribe({
        next:(data) => {
          if (data.status) {
            this.httpCommon.presentToast(data.msg, 'success');
            this.navCtrl.pop();
          } else {
            this.httpCommon.presentToastWithOk(data.msg, 'warning');
            if (data.cat_head && data.cat_ques) {
              // this.scrollCategory(data);
            } else {
            }
          }
        },
        error:() => {
          this.dismissloading();
          this.httpCommon.presentToast(environment.errMsg, 'danger');
        },
        complete:() => {
          this.dismissloading();
        }
      });
    });
  }

  viewDocs(url: string) {
    this.httpCommon.openDoc(url);
  }

  async presentLoading(msg?: string) {
    this.loading = await this.loadingController.create({
      cssClass: 'my-custom-class',
      message: msg ? msg: 'Please Wait...',
      duration: 8000
    });
    await this.loading.present();
  }

  async dismissloading() {
    if (this.loading) {
      this.loading.dismiss();
    }
  }

  actionCategory(val: any, rowIndex: any, colIndex: any) {
    this.index = rowIndex.toString() + colIndex.toString();
    this.rowIndex = rowIndex;
    this.colIndex = colIndex;
    val.q_desc_temp = val.cat_desc_temp ? val.cat_desc_temp : val.cat_desc;
    val.tempoutput = val.tempoutput ? val.tempoutput : 'category';
    val.bgcolor = true
    this.loop = true;
    this.scrollToDiv(this.index);
    this.speak(val);
  }

  actionSpeak(val: any, rowIndex: any, colIndex: any) {
    this.index = rowIndex.toString() + colIndex.toString();
    this.rowIndex = rowIndex;
    this.colIndex = colIndex;
    val.q_desc_temp = val.q_desc;
    val.tempoutput = 'response';
    val.bgcolor = true,
    this.loop = true;
    this.scrollToDiv(this.index);
    this.speak(val);
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
        val.speak = true;
        val.bgcolor = false;
        if (!this.loop) {return}
        if (val.tempoutput === 'document') {
          this.presentActionSheet(val, 2);
        } else if (val.tempoutput === 'final') {
          return;
        } else {
          if (this.platform.is('capacitor')) {
            this.listen(val);
          } else {
            this.listenAction(val, 'Yes');
          }
        }
      }).catch(err => {

      });
    };
    speak();
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
      } else if (val.tempoutput === 'category') {
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
    let respns, obj, option: any, voiceResponse;
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
      val.rspns = respns;
      val.response.optn_id = val.rspns;
      val.listen = true
      const obj = {
        wo_id: this.requestedData.wo_id,
        rspns: val.rspns,
        q_id: val.q_id,
        q_type: val.q_type,
        q_max_score: val.q_max_score,
        rspns_source: environment.source
      }
      this.submitResponseAction(obj, val);
    } else if (val.tempoutput === 'remark') {
      val.remark = voiceResponse
      const obj1 = {
        wo_id: this.requestedData.wo_id,
        remark: voiceResponse,
        q_id: val.q_id,
        rspns_source: environment.source
      };
      this.submitRemarkAction(obj1, val);
    } else if (val.tempoutput === 'document') {
      this.presentActionSheet(val, 2);
    } else if (val.tempoutput === 'category') {
      const obj = this.myCategory[this.rowIndex];
      if (voiceResponse === 'yes' || voiceResponse === 'yess' || voiceResponse === 'yeees' || voiceResponse === 'yaaa' || voiceResponse === 'ha') {
        this.submitCategoryAction(obj, 1);
      } else if (voiceResponse === 'n a' || voiceResponse === 'na' || voiceResponse === 'not applicable' || voiceResponse === 'not app') {
        this.submitCategoryAction(obj, 3);
      } else {
        obj.tempoutput = 'category';
        obj.q_desc_temp = 'Category Only Accept Yes or Not Applicable';
        this.speak(val);
        return;
      }
    }
  }

  responseCondition() {}

  remarkCondition() {}

  categoryCondition() {}

  repeatLoop() {
    if (!this.loop) { return }
    let  currCatLen;
    currCatLen = this.myCategory[this.rowIndex].qus.length;
    if (this.colIndex < currCatLen && this.rowIndex < this.myCategory.length) {
      this.actionSpeak(this.myCategory[this.rowIndex].qus[this.colIndex], this.rowIndex, this.colIndex);
    } else if (this.rowIndex < this.myCategory.length - 1){
      this.rowIndex = this.rowIndex + 1;
      this.colIndex = 0;
      const obj = this.myCategory[this.rowIndex];
      obj.cat_desc_temp = 'This Category is Completed. Please Response Next Category. ' + obj.cat_desc;
      obj.tempoutput = 'category';
      this.actionCategory(obj, this.rowIndex, this.colIndex);
    } else {
      const obj = {
        q_desc_temp: 'All PMS Completed. Thankyou',
        tempoutput: 'final'
      }
      this.rowIndex = this.myCategory.length;
      this.loop = false;
      this.speak(obj);
    }
  }

  stopSpeaker() {
    this.loop = false;
    const stop = async () => {
      await TextToSpeech.stop();
    };
    stop();
    this.myCategory[this.rowIndex].qus[this.colIndex].bgcolor = false;
  }

  async openTicketHold() {
    const modal = await this.modalCtrl.create({
      component: HoldPpmComponent,
      cssClass: 'my-modal_',
      backdropDismiss:false,
      componentProps: { 
        pc_id: this.requestedData.pc_id,
        tkts_id: this.requestedData.id,
        hold_validation: this.actionPermission.hold_validation
      }
    });    
    modal.onWillDismiss().then(disModal => {
      if (disModal.role == 'true') {      
        this.actionPermission.can_hold_ticket = !this.actionPermission.can_hold_ticket;
        this.actionPermission.is_ppm_wo_on_hold = !this.actionPermission.is_ppm_wo_on_hold;
        this.actionPermission.wo_is_on_hold = !this.actionPermission.wo_is_on_hold;
        this.actionPermission.wo_is_on_hold_msg = 'Work Order is on hold process. Please contact your Team Leader.'
      }
    });
    modal.present();
  }  

  // buttons: [{
  //       text:'In Progress',
  //       cssClass: 'alert-bold-btn',
  //       handler: (dat) => {
  //         if(dat.remark){
  //           const obj = {
  //             unHoldRemark: dat.remark,
  //             tkts_id: this.ticket_id,
  //             pc_id: this.requestedData.pc_id,
  //             source: environment.source,
  //             action_type: 'UNHOLD'
  //           }                          
  //           this.unholdAction(obj);
  //         } else {
  //           this.httpCommon.presentToast('Please Enter Remark', 'warning');
  //         }
  //       }
  //     }, {
  //       text: 'Cancel',
  //       cssClass: 'alert-light-btn',
  //       handler: (data) => {
  //       }
  //     }]

  async presentAlertConfirm() {
    const alert = await this.alertController.create({
      cssClass: 'my-custom-class',
      header: 'Warning',
      message: 'Once the Status is changed, it can not be undone.',
      mode: 'ios',
      inputs: [{
        name: 'remark',
        type:'textarea',
        placeholder: 'Enter Remarks',
      }],
      buttons: [{
        text:'In Progress',
        cssClass: 'alert-bold-btn',
        handler: (dat) => {
          if(dat.remark){
            const obj = {
              unHoldRemark: dat.remark,
              wo_id: this.requestedData.id,
              pc_id: this.requestedData.pc_id,
              source: environment.source,
              action_type: 'UNHOLD'
            }                          
            this.unholdAction(obj);
          } else {
            this.httpCommon.presentToast('Please Enter Remark', 'warning');
          }
        }
      }, {
        text: 'Cancel',
        cssClass: 'alert-light-btn',
        handler: (data) => {
        }
      }]
    });
    await alert.present();
  }

  unholdAction(obj: any) {
    this.httpCommon.presentLoading().then(preLoad => {
      this.httpPmCal.pmsHoldAction(obj).subscribe({
        next:(data: any) => {
          if (data.status) {
            this.actionPermission.can_hold_ticket = !this.actionPermission.can_hold_ticket
            this.actionPermission.is_ppm_wo_on_hold = !this.actionPermission.is_ppm_wo_on_hold
            this.actionPermission.wo_is_on_hold = !this.actionPermission.wo_is_on_hold
            this.httpCommon.presentToast(data.msg, 'success');            
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
      });
    });    
  }

}
