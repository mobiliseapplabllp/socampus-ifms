import { Component, OnInit } from '@angular/core';
import { AddReadingComponent } from './add-reading/add-reading.component';
import { ModalController, LoadingController, Platform } from '@ionic/angular';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { CommonService } from 'src/app/provider/common/common.service';
import { MeterService } from 'src/app/provider/meter/meter.service';
import { CameraService } from 'src/app/provider/camera/camera.service';
@Component({
  selector: 'app-meter',
  templateUrl: './meter.page.html',
  styleUrls: ['./meter.page.scss'],
})
export class MeterPage implements OnInit {
  meterInfo: any = [];
  meterInfoCopy: any = [];
  loading: any;
  formData = new FormData();
  qrType!: string;
  qrObj: any = {};
  constructor(
    private modalCtrl: ModalController,
    private router: Router,
    private common: CommonService,
    private loadingController: LoadingController,
    private httpMeter: MeterService,
    private platform: Platform,
    private camera: CameraService
  ) { }

  ngOnInit() {
    this.common.setBarcode('');
    this.getPendingWo();
  }

  ionViewDidEnter() {
    let bar = this.common.getBarcode();
    if (bar) {
      this.common.setBarcode('');
      if (this.qrType === 'site') {
        this.meterInfo = [];
        this.meterInfoCopy = [];
        this.getPendingWOusingBarcode(bar);
      } else if (this.qrType === 'verify') {
        let ext_id ,enc_key, split = bar.split('/');
        enc_key = split[split.length - 1];
        ext_id = this.common.decryptValue(enc_key);
        if (ext_id === this.qrObj.ext_id) {
          this.qrObj.isQrVerify = true;
        } else {
          this.common.presentToast(`You are scanning Wrong QR Code ${ext_id}`, 'warning');
        }
      }
    }
  }

  getPendingWOusingBarcode(url: string) {
    let lastEncryptedString = url.includes('meter-schedule-by-qrcode/') ? url.split('meter-schedule-by-qrcode/')[1] : '';
    if (!lastEncryptedString) {
      this.common.presentToast('You are scanning wrong QR', 'warning');
      return;
    }
    let fullUrl = environment.url + 'meter/ifms/meter-schedule-by-qrcode/' + lastEncryptedString
    this.presentLoading().then(preLoad => {
      this.httpMeter.getPendingWoBarcode(fullUrl).subscribe({
        next:(data) => {
          if (data.status) {
            this.meterInfo = data.data;
            this.meterInfoCopy = data.data;
          } else {
            this.common.presentToast(data.info, 'warning');
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

  getPendingWo() {
    this.presentLoading().then(preLoad => {
      this.httpMeter.getPendingWo().subscribe({
        next:(data) => {
          if (data.status) {
            this.meterInfo = data.data;
            this.meterInfoCopy = data.data;
          } else {
            this.common.presentToast(data.info, 'warning');
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

  async addReading() {
    const modal = await this.modalCtrl.create({
      component: AddReadingComponent,
      cssClass: 'my-modal',
      componentProps: { }
    });
    modal.present();
  }

  openPage(url: string) {
    this.router.navigateByUrl(url);
  }

  history() {
    this.router.navigateByUrl('/meter/history');
  }

  updRead(dat: any) {
    if (this.checkConsumptionCondition(dat) && this.checkGenertionCondition(dat) && this.checkOtherCondition(dat)) {
      const obj = {
        wo_id: dat.wo_id,
        consume_reading: dat.consumption_reading || '',
        gen_reading: dat.generate_reading || '',
        new_oth_reading: dat.other_reading || '',
        con_remark: dat.con_remark || '',
        gen_remark: dat.gen_remark || '',
        oth_remark: dat.oth_remark || '',
        ideal_reading: dat.ideal_reading || '',
        meter_id: dat.meter_id,
      };
      this.save(obj, dat);
    }
  }

  updateReading(dat: any, type: any) {
    if (type === 'consumption' ) {
      if (this.checkConsumptionCondition(dat)) {
        const obj = {
          wo_id: dat.wo_id,
          consume_reading: dat.consumption_reading,
        }
        this.save(obj, dat);
      }
    } else if (type === 'generation') {
      if (this.checkGenertionCondition(dat)) {
        const obj = {
          wo_id: dat.wo_id,
          gen_reading: dat.generate_reading
        }
        this.save(obj, dat);
      }
    } else if (type === 'both') {
      if (this.checkConsumptionCondition(dat) && this.checkGenertionCondition(dat) && this.checkOtherCondition(dat)) {
        const obj = {
          wo_id: dat.wo_id,
          consume_reading: dat.consumption_reading,
          gen_reading: dat.generate_reading,
          new_oth_reading: dat.other_reading
        }
        this.save(obj, dat);
      }
    }
  }

  openBarcode(type: string, dat?: any) {
    if (this.platform.is('capacitor')) {
      this.qrType = type;
      this.qrObj = dat;
      this.router.navigateByUrl('/barcode');
    } else {
      dat.isQrVerify = true;
    }
  }

  checkConsumptionCondition(dat: any) {
    if (dat.is_consumption == 1 && !dat.consumption_reading) {
      this.common.presentToast('Consumption Reading is Mandatory', 'warning');
      return false;
    } else if (dat.is_consumption == 1 && dat.is_remark_req == 1 && !dat.con_remark) {
      this.common.presentToast('Consumption Remark is Mandatory', 'warning');
      return false;
    } else if (dat.is_consumption == 1 && dat.is_img_req && !dat.isConsumptionImg) {
      this.common.presentToast('Consumption Image is Mandatory', 'warning');
      return false;
    } else {
      return true;
    }
  }

  checkGenertionCondition(dat: any) {
    if (dat.is_generation == 1 && !dat.generate_reading) {
      this.common.presentToast('Generation Reading is Mandatory', 'warning');
      return false;
    } else if (dat.is_generation == 1 && dat.is_remark_req == 1 && !dat.gen_remark) {
      this.common.presentToast('Generation Remark is Mandatory', 'warning');
      return false;
    } else if (dat.is_generation == 1 && dat.is_img_req && !dat.isGenerationImg) {
      this.common.presentToast('Generation Image is Mandatory', 'warning');
      return false;
    } else {
      return true;
    }
  }

  checkOtherCondition(dat: any) {
    if (dat.oth_read == 1 && !dat.other_reading) {
      this.common.presentToast('Other Reading is Mandatory', 'warning');
      return false;
    } else if (dat.oth_read == 1 && dat.is_remark_req == 1 && !dat.oth_remark) {
      this.common.presentToast('Other Remark is Mandatory', 'warning');
      return false;
    } else if (dat.oth_read == 1 && dat.is_img_req && !dat.isOtherImg) {
      this.common.presentToast('Other Image is Mandatory', 'warning');
      return false;
    } else {
      return true;
    }
  }

  save(obj: any, dat: any) {
    for (let key in obj) {
      this.formData.delete(key);
      this.formData.append(key, obj[key]);
    }
    this.presentLoading().then(preLoad => {
      this.httpMeter.updateReading(this.formData).subscribe({
        next:(data) => {
          if (data.status) {
            this.common.presentToast(data.msg, 'success');
            dat.isRemove = true
            setTimeout(() => {
              this.meterInfo = this.meterInfo.filter((val: any) => val.wo_id !== obj.wo_id);
              this.meterInfoCopy = this.meterInfoCopy.filter((val: any) => val.wo_id !== obj.wo_id);
              this.formData = new FormData();
            }, 500);
          } else {
            this.common.presentToast(data.msg, 'warning');
          }
        },
        error:() => {
          this.common.presentToast(environment.errMsg, 'danger');
          this.dismissloading();
        },
        complete:() => {
          this.dismissloading();
        }
      });
    })
  }

  checkPhotoCondition(dat: any, type: any) {
    if (dat.is_gllry_upld_allwd == 1) {
      this.presentActionSheet(1, dat , type);
    } else if (dat.is_gllry_upld_allwd == 0) {
      this.presentActionSheet(0, dat , type);
    } else {
      alert('Gallery is Undefined ' + dat.is_gllry_upld_allwd);
    }
  }

  async presentActionSheet(val: any, data: any, type: any) {
    let obj: any = [];
    if (val === 1) {
      obj = ['camera', 'gallery'];
    } else {
      obj = ['camera'];
    }
    this.camera.selectImage(['camera', 'gallery'], (blob: Blob) => {
      this.readImg(blob, data ,type)
    });
  }

  async readImg(blob: any, data: any,type: any) {
    let random = Date.now() + Math.floor(Math.random() * 90000) + 10000 + '.jpg'
    if (type == 'consumption') {
        this.formData.delete('img1');
        this.formData.append('img1', blob, random);
        data.isConsumptionImg = true;
        for (var i = 0; i < this.meterInfo.length;i++) {
          if (data.wo_id !== this.meterInfo[i].wo_id) {
            this.meterInfo[i].isConsumptionImg = false;
          }
        }
      } else if (type == 'generate_reading') {
        this.formData.delete('img2');
        this.formData.append('img2', blob, random);
        data.isGenerationImg = true;
        for (var i = 0; i < this.meterInfo.length;i++) {
          if (data.wo_id !== this.meterInfo[i].wo_id) {
            this.meterInfo[i].isGenerationImg = false;
          }
        }
      } else if (type === 'other') {
        this.formData.delete('img3');
        this.formData.append('img3', blob, random);
        data.isOtherImg = true;
        for (var i = 0; i < this.meterInfo.length;i++) {
          if (data.wo_id !== this.meterInfo[i].wo_id) {
            this.meterInfo[i].isOtherImg = false;
          }
        }
      }
      this.presentLoading().then(preLoad => {
        setTimeout(() => {
          this.dismissloading();
        }, 500)
      })
  }

  async presentLoading() {
    this.loading = await this.loadingController.create({
      cssClass: 'my-custom-class',
      message: 'Please wait...'
    });
    await this.loading.present();
  }

  async dismissloading() {
    if (this.loading) {
      this.loading.dismiss();
    }
  }

  meterReadingHistory(dat: any) {
    this.router.navigate(['meter/reading-history'], {
      queryParams: {
        data: JSON.stringify(dat),
      }
    });
  }

  changeSearch(ev: any) {
    this.meterInfo = this.meterInfoCopy;
    this.meterInfo =  this.meterInfo.filter((dat: any) => {
      if (dat.make.toLowerCase().indexOf(ev.target.value.toLowerCase())> -1) {
        return (dat.make.toLowerCase().indexOf(ev.target.value.toLowerCase()) > -1);
      } else if (dat.ext_id.toLowerCase().indexOf(ev.target.value.toLowerCase())> -1) {
        return (dat.ext_id.toLowerCase().indexOf(ev.target.value.toLowerCase()) > -1);
      }
      return;
    });
  }
}
