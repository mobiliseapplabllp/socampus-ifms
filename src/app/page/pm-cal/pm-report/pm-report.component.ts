import { Component,OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AlertController, LoadingController, NavController, Platform } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { PmCalService } from 'src/app/provider/pm-cal/pm-cal.service';
import { environment } from 'src/environments/environment';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { SpeechRecognition } from "@capacitor-community/speech-recognition";
import { DigitalChecklistService } from 'src/app/provider/digital-checklist/digital-checklist.service';
import { CameraService } from 'src/app/provider/camera/camera.service';
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
    private camera: CameraService) {

  }

  ngOnInit() {
    this.activeroute.queryParams.subscribe((res) => {
      this.requestedData = JSON.parse(res['data']);
      this.getScheduleQuestion();
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

  scrollToDiv(id: string) {
    setTimeout(() => {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth'});
      }
    }, 1000);
  }

  getScheduleQuestion() {
    this.presentLoading('Please Wait').then(preLoad => {
      this.httpPmCal.getScheduleQuestion(this.requestedData.wo_id).subscribe({
        next:(data) => {
          this.myCategory = data.data.categories;
          this.myCategory.forEach((element: any) => {
            element.isResponseShow = false;
            element.qus.forEach((el: any) => {
              if(el.response) {
                el.remark = el.response.remark;
                el.attachment = el.response.attachment1;
                if(el.q_type == '226') {
                  el.rspns = el.response.optn_id;
                  if (el.rspns) {
                    const obj = el.options.filter((val: any) => val.optn_id === el.rspns)[0];
                    el.is_doc_mandatory = obj.is_doc_mandatory;
                    el.is_rmrk_mandatory = obj.is_rmrk_mandatory;
                  }
                } else {
                  el.rspns = el.response.rspns;
                }
              } else {
                el.response = {}
              }
            });
          });
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

  expand(data: any, ind: any) {
    this.rowIndex = ind;
    this.colIndex = 0;
    if (data.qus.length > 0 && data.is_applicable !== 1) {
      for (var i = 0 ; i < data.qus.length; i ++) {
        data.qus[i].rspns = '';
      }
    }
    this.submitCategoryAction(data, 1)
  }

  submitCategoryAction(data: any, is_applicable: number) {
    const obj = {
      cat_id: data.cat_id,
      is_applicable: is_applicable,
      rspns_source: environment.source,
      wo_id: this.requestedData.wo_id,
    };
    this.presentLoading('Please Wait..').then(preLoad => {
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

  async presentActionSheet(val: any, ind: any) {
    let obj: any = [];
    if (ind === 1) {
      obj = ['camera', 'gallery'];
    } else {
      obj = ['camera']
    }
    this.camera.selectImage(obj, (blob: Blob) => {
      this.readImg(blob, val)
    });
  }

  async readImg(blob: any, data: any) {
    let random = Date.now() + Math.floor(Math.random() * 90000) + 10000 + '.jpg'
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
  }

  finalSubmit() {
    const obj = {
      status: 2,
      wo_id: this.requestedData.wo_id,
      source: environment.source
    };
    for (let i = 0; i < this.myCategory.length; i++) {
      if (!this.myCategory[i].is_applicable) {
        this.httpCommon.presentToastWithOk(`Please Add Response for Category ${i+1} ${this.myCategory[i].cat_desc}` , 'warning');
        this.scrollToDiv(i.toString());
        return;
      }
      if (this.myCategory[i].is_applicable != 3) {
        for (let j = 0; j < this.myCategory[i].qus.length; j++) {
          if (!this.myCategory[i].qus[j].rspns) {
            this.httpCommon.presentToastWithOk(`Please add Response for Question No ${ j + 1} from Category ${ this.myCategory[i].cat_desc }`, 'warning');
            this.myCategory[i].qus[j].isNotFill = true;
            this.myCategory[i].isResponseShow = true;
            let temp = i+j.toString();;
            setTimeout(() => {
              this.scrollToDiv(temp);
            }, 100);
            return;
          } else {
            this.myCategory[i].isResponseShow = false;
            this.myCategory[i].qus[j].isNotFill = false;
          }
        }
      }
    }

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

  async presentLoading(msg: string) {
    this.loading = await this.loadingController.create({
      cssClass: 'my-custom-class',
      message: msg,
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
}
