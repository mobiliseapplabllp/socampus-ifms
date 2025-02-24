import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LoadingController, NavController, Platform } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { PmCalService } from 'src/app/provider/pm-cal/pm-cal.service';
import { environment } from 'src/environments/environment';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

@Component({
  selector: 'app-fill-qus',
  templateUrl: './fill-qus.component.html',
  styleUrls: ['./fill-qus.component.scss'],
})
export class FillQusComponent  implements OnInit {
  requestedData: any;
  questionList: any = [];
  loading: any;
  selectedLanguage!: string;
  loop!: boolean;
  isOpen!: boolean;
  data: any = [];
  constructor(
    private activeroute: ActivatedRoute,
    private httpPms: PmCalService,
    private common: CommonService,
    private loadingController: LoadingController,
    private platform: Platform,
    private navCtrl: NavController
  ) { }

  ngOnInit() {
    this.activeroute.queryParams.subscribe((res) => {
      this.requestedData = JSON.parse(res['data']);
      this.questionList = this.requestedData.qus;
      this.questionList.forEach((el: any) => {
        const obj = el.options.filter((val: any) => val.optn_id === el.rspns)[0];
        if (obj) {
          el.is_doc_mandatory = obj.is_doc_mandatory;
          el.is_rmrk_mandatory = obj.is_rmrk_mandatory;
        }
        if (!el.response) {
          el.response = {}
        }
      });
      console.log(this.questionList);
      return;
      this.getQuestionList(this.requestedData.wo_id, this.requestedData.cat_id);
    });
  }

  getQuestionList(wo_id: any, cat_id: any) {
    this.presentLoading().then(preLoad => {
      this.httpPms.getQuestionList( cat_id, wo_id).subscribe({
        next:(data: any) => {
          if (data.status) {
            this.questionList = data.data.category?.qus;
            this.questionList.forEach((el: any) => {
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

  openModal(data: any) {
    console.log(data);
    this.isOpen = true;
    this.data = data;
  }

  onWillDismiss() {
    this.isOpen = false;
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
    // let rspns_count = 0;
    // this.category.qus.forEach((element: any) => {
    //   if (element.response?.optn_id) {
    //     rspns_count = rspns_count + 1;
    //     this.category.rspns_count = rspns_count;
    //   }
    // });
    // this.category.progress = Math.round(this.category.rspns_count * 100 / this.category.qus.length);
    // this.category.progress1 = this.category.progress / 100
    this.submitResponseAction(obj, data)
  }

  submitResponseAction(obj: any, data: any) {
    console.log(data);
    this.presentLoading('Please Wait').then(preLoad => {
      this.httpPms.scheduleResponseAction(obj).subscribe({
        next:(dat) =>{
          if (dat.status) {
            this.common.presentToast(dat.msg, 'success');
            data.response.optn_id = data.rspns;
            const obj = data.options.filter((val1: any) => val1.optn_id === data.rspns)[0];
            data.is_doc_mandatory = obj.is_doc_mandatory;
            data.is_rmrk_mandatory = obj.is_rmrk_mandatory;
            data.is_correct = obj.is_correct;
            data.isNotFill = false;
            const count = this.questionList.filter((val: any) => val.rspns).length;
            this.requestedData.responded_questions = count

            if (data.is_rmrk_mandatory && data.speak) {
              data.tempoutput = 'remark';
              data.q_desc_temp = 'Please Speak Remark';
              this.speak(data);
            } else if (!data.is_rmrk_mandatory && data.speak) {
              this.repeatLoop();
            }

          } else {
            data.rspns = '';
            this.common.presentToast(dat.msg, 'warning');
          }
        },
        error:() => {
          data.rspns = '';
          this.dismissloading();
          this.common.presentToast(environment.errMsg, 'danger');
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
      this.httpPms.scheduleResponseActionRem(obj1).subscribe({
        next:(dat) => {
          if (dat.status) {
            this.common.presentToast(dat.msg, 'success');
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
            this.common.presentToast(dat.msg, 'warning');
          }
        },
        error:() => {
          this.dismissloading();
          this.common.presentToast(environment.errMsg, 'warning');
        },
        complete:() => {
          this.dismissloading();
        }
      });
    });
  }
  async presentActionSheet(val: any, ind: any) {
    var obj: any = {}
    if (ind === 1) {
      obj = {
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Uri,
      }
    } else {
      obj = {
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
      }
    }
    const takePicture = async () => {
      const image = await Camera.getPhoto(obj);
      this.readImg(image, val)
    };
    takePicture();
  }

  async readImg(photo: any, data: any) {
    let random = Date.now() + Math.floor(Math.random() * 90000) + 10000 + '.jpg'
    const response = await fetch(photo.webPath);
    const blob = await response.blob();
    let formData = new FormData();
    formData.append('wo_id', this.requestedData.wo_id);
    formData.append('q_id',  data.q_id);
    formData.append('rspns_source', environment.source);
    formData.append('attachment2', blob, random);
    data.imagename = '';
    this.presentLoading('Please Wait..').then(preLoad => {
      this.httpPms.scheduleResponseActionDoc(formData).subscribe({
        next:(dat) => {
          if (dat.status) {
            data.imagename = 'Uploaded';
            data.isNotFill = false;
            this.common.presentToast(dat.msg, 'success');
            this.repeatLoop();
          } else {
            this.common.presentToast(dat.msg, 'warning');
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

  viewDocs(url: string) {
    this.common.openDoc(url);
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
          // if (this.platform.is('capacitor')) {
          //   this.listen(val);
          // } else {
          //   this.listenAction(val, 'Yes');
          // }
        }
      }).catch(err => {

      });
    };
    speak();
  }

  repeatLoop() {

  }

  // if (this.scheduleArr[i].qus[j].isRemarkMandatory == 1 && !this.scheduleArr[i].qus[j].remark) {
  //   this.common.presentToast(`Please Add Remark for Question No ${j+1}`, 'warning');
  //   this.scheduleArr[i].qus[j].isNotFill = true;
  //   this.scroll(j);
  //   return;
  // } else if(this.scheduleArr[i].qus[j].isDocMandatory == 1 && !this.scheduleArr[i].qus[j].imagename) {
  //   this.common.presentToast(`Please Add Attachment for Question No ${j+1}`, 'warning');
  //   this.scheduleArr[i].qus[j].isNotFill = true;
  //   this.scroll(j);
  //   return;
  // } else {
  //   this.scheduleArr[i].qus[j].isNotFill = false;
  // }

  submit() {
    let index = -1;
    for (var i = 0 ; i < this.questionList.length; i++) {
      if (!this.questionList[i].rspns) {
        this.questionList[i].isNotFill = true
        index = i;
        this.common.presentToast(`Please add response for Question No ${i+1} (${this.questionList[i].q_desc})`, 'warning');
        break;
      } else {
        if (this.questionList[i].is_rmrk_mandatory === 1 && !this.questionList[i].remark) {
          index = i;
          this.common.presentToast(`Please Add Remark for Question No ${i+1}`, 'warning');
          break;
        } else if (this.questionList[i].is_doc_mandatory === 1 && (!this.questionList[i].attachment1 && !this.questionList[i].imagename )) {
          index = i;
          this.common.presentToast(`Please Add Attachment for Question No ${i+1}`, 'warning');
          break;
        } else {
          this.questionList[i].isNotFill = false
        }
      }
    }

    if (index >= 0) {
      this.scrollToDiv(index.toString());
    } else {
      this.pop();
    }
  }



  pop() {
    this.navCtrl.pop();
  }

  scrollToDiv(id: string) {
    console.log('scrolling');
    setTimeout(() => {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth'});
      }
    }, 1000);
  }

}
