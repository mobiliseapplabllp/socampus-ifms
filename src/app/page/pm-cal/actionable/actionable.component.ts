import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonDatetime, LoadingController } from '@ionic/angular';
import * as moment from 'moment';
import { CommonService } from 'src/app/provider/common/common.service';
import { PmCalService } from 'src/app/provider/pm-cal/pm-cal.service';
import { environment } from 'src/environments/environment';
import { Camera, CameraResultType } from '@capacitor/camera';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
@Component({
  selector: 'app-actionable',
  templateUrl: './actionable.component.html',
  styleUrls: ['./actionable.component.scss'],
})
export class ActionableComponent  implements OnInit {
  @ViewChild('popoverDatetime')  popoverDatetime!: IonDatetime;
  public addResponse!: FormGroup;
  requestedData: any = [];
  status = 'actionable';
  actionableArr: any = [];
  allRes: any = [];
  isOpen = false;
  isPreOpen = false;
  isMoreInfo = false;
  questionList: any;
  previousRes: any = [];
  formData = new FormData();
  isImgUpload!: boolean;
  loading: any;
  maxDate = moment().format('YYYY-MM-DD');
  minDate!: string;
  data: any = [];
  constructor(
    private activeroute: ActivatedRoute,
    private httpPms: PmCalService,
    private loadingController: LoadingController,
    private common: CommonService,
    private formbuilder: FormBuilder,
    private router: Router
  ) { }

  ngOnInit() {
    this.activeroute.queryParams.subscribe((res: any) => {
      this.requestedData = JSON.parse(res.data);
    });
    this.initializeForm();
  }

  initializeForm() {
    this.addResponse = this.formbuilder.group({
      q_id: [this.requestedData.q_id],
      corrective_action: ['', Validators.required],
      rspns_date: ['' , Validators.required],
      remark: ['', Validators.required],
      source: [environment.source]
    });
  }

  viewReport(data: any) {
    console.log(data);
    data.wo_no = this.requestedData.wo_no
    this.router.navigate(['/pm-calibration/view-report'], {
      queryParams: {
        data: JSON.stringify(data),
      }
    });
  }


  ionViewDidEnter() {
    this.getScheduleUser();
    // this.getActionable();
  }

  getScheduleUser() {
    this.presentLoading().then(preLoad => {
      this.httpPms.getScheduleUser(this.requestedData.wo_id).subscribe({
        next:(data) => {
          if (data.status) {
            this.arrangeArr(data.data.categories);
            let originalarr = data.data.categories;
            this.actionableArr = originalarr.reduce((acc: any, curr: any) => {
              let qusWithCatDesc = curr.qus.filter((qusItem: any, index: number) => qusItem.isDtlShow && qusItem.status === 0)
                .map((qusItem: any, index: any) => ({
                  ...qusItem,
                  cat_desc: curr.cat_desc,
                  index: index
                }));
              return acc.concat(qusWithCatDesc);
            }, []);
            console.log(this.actionableArr);
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
    });
  }

  arrangeArr(data: any) {
    let outputArr = data.map((item: any) => {
      // Calculate total_length and pending based on the qus array
      let total_length = item.qus.length;
      let action_done = item.qus.filter((q: any) => !(q.status === 0 && q.isDtlShow)).length;

      // Return the new object with total_length and pending
      return {
        ...item,
        total_length: total_length,
        action_done: action_done
      };
    });
    this.allRes = outputArr;
    console.log(outputArr);
  }

  getActionable() {
    this.presentLoading().then(preLoad => {
      this.httpPms.getActionableQuestion(this.requestedData.wo_id).subscribe({
        next:(data) =>{
          if (data.status) {
            const originalarr = data.data?.categories;
            this.actionableArr = originalarr.reduce((acc: any, curr: any, index: number) => {
              let qusWithCatDesc = curr.qus.map((qusItem: any) => ({
                ...qusItem,
                cat_desc: curr.cat_desc,
                index: index
              }));
              return acc.concat(qusWithCatDesc);
            }, []);
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

  async presentLoading(msg?: string) {
    this.loading = await this.loadingController.create({
      cssClass: 'my-custom-class',
      message: msg ? msg: 'Please Wait...',
    });
    await this.loading.present();
  }

  async dismissloading() {
    if (this.loading) {
      this.loading.dismiss();
    }
  }

  openModalInfo(data: any) {
    console.log(data);
    this.isMoreInfo = true;
    this.data = data;
  }


  openActionModal(data: any)   {
    this.questionList = data;
    const obj = {
      corrective_action: data.rspns,
      remark: data.remark,
      artifact: data.attachment1,
      original_rspns: true
    }
    this.questionList.response_txn.push(obj);
    this.isOpen = true;
    this.minDate = moment(this.questionList.created_at).format('YYYY-MM-DD');
  }

  openPreRes(data: any) {
    this.previousRes = data;
  }

  changeDate() {
    this.popoverDatetime.confirm(true);
  }

  onWillPresent() {
    this.isPreOpen = false;
    // this.initializeForm();
  }

  onWillDismissMoreInfo() {
    this.isMoreInfo = false;
  }

  submitActionable() {
    if (!this.isImgUpload) {
      this.common.presentToast('Attachment is Required', 'warning');
      return;
    }
    if (!this.addResponse.value.corrective_action) {
      this.common.presentToast('Please Response Corrective Action', 'warning');
      return;
    }
    if (!this.addResponse.value.remark) {
      this.common.presentToast('Please Add Corrective Remark', 'warning');
      return;
    }
    if (!this.addResponse.value.rspns_date) {
      this.common.presentToast('Please Add Corrective Date', 'warning');
      return;
    }
    let date = this.addResponse.value.rspns_date;
    this.addResponse.get('rspns_date')?.setValue(moment(date).format('YYYY-MM-DD'));
    this.formData.delete('wo_id');
    this.formData.delete('rspns_id');
    this.formData.append('wo_id', this.questionList.wo_id);
    this.formData.append('rspns_id', this.questionList.rspns_id);
    for (let key in this.addResponse.value) {
      this.formData.delete(key);
      this.formData.append(key, this.addResponse.value[key]);
    }

    this.presentLoading().then(preLoad => {
      this.httpPms.updateUserAction(this.formData).subscribe({
        next:(dat) => {
          if (dat.status) {
            this.common.presentToast(dat.msg, 'success');
            this.isOpen = false;
            this.initializeForm();
            this.isImgUpload = false;
            this.getScheduleUser();
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

  async presentActionSheet() {
    const takePicture = async () => {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
      });
      this.readImg(image)
    };
    takePicture();
  }

  async readImg(photo: any) {
    let random = Date.now() + Math.floor(Math.random() * 90000) + 10000 + '.jpg'
    const response = await fetch(photo.webPath);
    const blob = await response.blob();
    this.isImgUpload = true;
    this.formData.delete('artifact');
    this.formData.append('artifact', blob, random);
    this.presentLoading().then(preLoad => {
      setTimeout(() => {
        this.dismissloading();
      }, 500);
    })
  }

  openDoc(url: string) {
    this.common.openDoc(url);
  }
}
