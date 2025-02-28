import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController, ModalController, Platform } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { PmCalService } from 'src/app/provider/pm-cal/pm-cal.service';
import { CostCenterComponent } from 'src/app/shared/cost-center/cost-center.component';
import { environment } from 'src/environments/environment';
import { PmAssignComponent } from './pm-assign/pm-assign.component';
import { Camera, CameraResultType } from '@capacitor/camera';
import { PtwUploadComponent } from './ptw-upload/ptw-upload.component';
import { DigitalChecklistService } from 'src/app/provider/digital-checklist/digital-checklist.service';
import * as moment from 'moment';
@Component({
  selector: 'app-pm-cal',
  templateUrl: './pm-cal.page.html',
  styleUrls: ['./pm-cal.page.scss'],
})
export class PmCalPage implements OnInit {
  status = 'open';
  pmCal: any = [];
  isSearch!:boolean;
  // pmCalCopy: any = [];
  // resolvedPm: any = [];
  // resolvedPmCopy: any = [];
  loading: any;
  // userData: any = [];
  // pmCalBoolean!: boolean;
  // pmCalResBoolean!: boolean;
  // counter = 0;
  // userInfo: any = [];
  // userName!: string;
  selectedData: any = [];
  openPm: any = [];
  openPmCopy: any = [];
  actionPm: any = [];
  actionPmCopy: any = [];
  closePm: any = [];
  closePmCopy: any = [];
  lastSegment = 1;
  lastPage: any;
  currentPage = 1;
  myWorkOrder: any = [];
  selectedPms: any = [];
  searchBy: any;
  searchValue: any;searchValueDesc: any;
  selectedObj: any = {};
  countObj: any = {};
  isPreOpen!: boolean;
  isCloseAction!: boolean;
  logs: any = [];
  closeRemark!: string
  constructor(
    private loadingController: LoadingController,
    private httpPms: PmCalService,
    private common: CommonService,
    private modalCtrl: ModalController,
    private router: Router,
    private platform: Platform
  ) { }

  ngOnInit() {
    this.common.setBarcode('');
  }

  ionViewDidEnter() {
    let bar = this.common.getBarcode(), split, type, ecn_key;
    if (bar) {
      this.common.setBarcode('');
      split = bar.split('/');
      if (split.length === 6) {
        type = split[4];
        ecn_key = split[5];
        let val = this.common.decryptValue(ecn_key);
        if (val === this.selectedObj.ext_asset_id) {
          this.openPage(this.selectedObj);
          return;
        } else {
          this.common.presentToast('You are Scan wrong QR Code ' + val, 'warning');
        }
      } else {
        this.common.presentToast('You are Scan Wrong QR Code', 'warning');
      }
      return;
    }
    this.getPmsCount();
    this.getPm(this.lastSegment);
  }

  getPmsCount() {
    this.httpPms.getPmCount().subscribe({
      next:(data) => {
        if (data.status) {
          this.countObj = data.data;
        } else {
          this.common.presentToast(data.msg, 'warning');
        }
      },
      error:() => {
        this.common.presentToast(environment.errMsg, 'danger');
      },
      complete:() => {

      }
    })
  }

  verifyBarcode(obj: any){
    // this.presentLoading().then(preLoad => {
    //   this.httpDigital.verifyAssetByQr(obj).subscribe({
    //     next:(dat: any) => {
    //       if (dat.status) {
    //         this.common.setBarcode('');
    //         this.openPage(this.selectedBarcode);
    //       } else {
    //         this.common.presentToast(dat.msg, 'warning');
    //       }
    //     }, error:() => {
    //       this.dismissloading();
    //       this.common.presentToast(environment.errMsg, 'danger');
    //     }, complete:() => {
    //       this.dismissloading();
    //     }
    //   })
    // })
  }

  ionViewDidLeave() {
    this.dismissloading();
  }

  getPm(stage_id: any) {
    this.refreshField();
    this.currentPage = 1;
    this.presentLoading().then(() => {
      this.httpPms.getPm(stage_id, this.currentPage).subscribe({
        next:(dat) => {
          if (dat.status) {
            this.pmCal = dat.data.data;
            this.lastPage = dat.data.last_page;
            this.currentPage = this.currentPage + 1;
            if (stage_id == 1) {
              this.openPm = this.pmCal.filter((val: any) => val.stage_id === 1);
              this.openPmCopy = this.pmCal.filter((val: any) => val.stage_id === 1);
            } else if (stage_id == 2) {
              this.actionPm = this.pmCal.filter((val: any) => val.stage_id === 2);
              this.actionPmCopy = this.pmCal.filter((val: any) => val.stage_id === 2);
            } else if (stage_id == 3) {
              this.closePm = this.pmCal.filter((val: any) => val.stage_id == 3)
              this.closePmCopy = this.pmCal.filter((val: any) => val.stage_id == 3)
            }
          } else {
            this.pmCal = [];
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

  refreshField() {
    this.pmCal = [];
    this.openPm = [];
    this.openPmCopy = [];
    this.actionPm = [];
    this.actionPmCopy = [];
    this.closePm = [];
    this.closePmCopy = [];
  }


  singleCancel(data: any) {
    this.isCloseAction = true;
    data.isSelect = true;
  }

  multiCancel() {
    this.isCloseAction = true;
  }

  filterIds() {
    let submitObj: any, arr =this.openPm.filter((val: any) => val.isSelect == true).map((item: any) => item.id);
    submitObj = {
      id: arr,
      data: {
        cancel_remark: this.closeRemark
      }
    }
    this.multiCancelAction(submitObj);
  }

  multiCancelAction(submitObj: any) {
    if (!this.closeRemark) {
      this.common.presentToast('Please Enter Remark', 'warning');
      return;
    }

    this.presentLoading().then(preLoad => {
      this.httpPms.closePms(submitObj).subscribe({
        next:(data: any) => {
          if (data.status) {
            this.common.presentToast(data.msg, 'success');
            this.closeRemark = '';
            this.isCloseAction = false;
            this.openPm = this.openPm.filter((item: any) => !submitObj.id.includes(item.id));
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

  multiAssign() {
    const obj =this.openPm.filter((val: any) => val.isSelect == true);
    this.pmAssign(obj);
  }

  changeCheckbox(val: any) {
    setTimeout(() => {
      this.selectedPms = this.openPm.filter((val: any) => val.isSelect == true);
    }, 500);
  }

  async pmAssign(dat: any) {
    const modal = await this.modalCtrl.create({
      component: PmAssignComponent,
      cssClass: 'my-modal-btm',
      initialBreakpoint: 1,
      breakpoints: [1],
      componentProps: { data: dat }
    });
    modal.onWillDismiss().then(disModal => {
      if (disModal.role) {
        this.httpPms.getData().subscribe((data: any) => {
          for (var i = 0; i < data.length; i++) {
            this.openPm = this.openPm.filter((val: any) => val.wo_id !== data[i].wo_id);
          }
        });
      }
    });
    modal.present();
  }

  cretePM() { }

  viewAttachment(url: string) {
    this.common.setImageCondition(url, 'blob');
  }

  openFillReport(data: any) {
    if (this.platform.is('capacitor')) {
      if (data.ext_asset_id) {
        this.selectedObj = data;
        this.openBarcode(data)
      } else {
        this.openPage(data);
      }
    } else {
      this.openPage(data);
    }

  }

  openBarcode(data: any) {
    this.router.navigateByUrl('/barcode');
  }

  openPage(data: any) {
    this.router.navigate(['/pm-calibration/pm-report'], {
      queryParams: {
        data: JSON.stringify(data),
      }
    });
  }

  async openRoName() {
    const modal = await this.modalCtrl.create({
      component: CostCenterComponent,
      cssClass: 'my-modal',
      componentProps : { }
    });
    modal.onWillDismiss().then(disModal => {
      if (disModal.role) {
        this.searchValueDesc = disModal.data.label;
        this.searchValue = disModal.data.value;
      }
    });
    return await modal.present();
  }

  async uploadPtw(dat: any) {
    const modal = await this.modalCtrl.create({
      component: PtwUploadComponent,
      cssClass: 'my-modal-ptw',
      initialBreakpoint: 1, // Set to 50% of the screen height
      breakpoints: [1],
      componentProps : {
        data: dat
      }
    });
    modal.onWillDismiss().then(disModal => {
      if (disModal.role) {
        dat.ptw_attach = disModal.data.ptw_attach
      }
    });
    return await modal.present();
  }

  changeSearchBy(ev: any) {
    console.log(ev.target.value);
    if (ev.target.value == 'all') {
      this.getPm(1);
    }
  }


  searchWoFromServer(stage_id: any) {
    if (this.searchBy == 'all') {
      this.getPm(1);
      return;
    }
    this.presentLoading().then(preLoad => {
      this.httpPms.searchTicketFromServer(this.searchBy, this.searchValue).subscribe(dat => {
        this.dismissloading();
        this.refreshField();
        if (dat.status) {
          this.pmCal = dat.data.data;
          this.lastPage = dat.data.last_page;
          this.currentPage = this.currentPage + 1;
          if (stage_id == 1) {
            this.openPm = this.pmCal.filter((val: any) => val.stage_id === 1);
            this.openPmCopy = this.pmCal.filter((val: any) => val.stage_id === 1);
          } else if (stage_id == 2) {
            this.actionPm = this.pmCal.filter((val: any) => val.stage_id === 2);
            this.actionPmCopy = this.pmCal.filter((val: any) => val.stage_id === 2);
          } else if (stage_id == 3) {
            this.closePm = this.pmCal.filter((val: any) => val.stage_id == 3)
            this.closePmCopy = this.pmCal.filter((val: any) => val.stage_id == 3)
          }
        } else {
          this.pmCal = [];
        }
      }, err => {
        this.dismissloading();
        this.common.presentToast(environment.errMsg, 'danger');
      });

    });
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

  changeSeg(ev: any) {
    this.selectedPms = [];
    if (ev.target.value == 'open') {
      this.lastSegment = 1;
      this.getPm(this.lastSegment);
    } else if (ev.target.value == 'actionable') {
      this.lastSegment = 2;
      this.getPm(this.lastSegment);
    } else if (ev.target.value == 'closed') {
      this.lastSegment = 3;
      this.getPm(this.lastSegment);
    } else if (ev.target.value == 'mywo') {

    }
  }

  async presentActionSheet(data: any) {
    const takePicture = async () => {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
      });
      this.readImg(image, data)
    };
    takePicture();
  }

  async readImg(photo: any, data: any) {
    let random = Date.now() + Math.floor(Math.random() * 90000) + 10000 + '.jpg'
    const response = await fetch(photo.webPath);
    const blob = await response.blob();
    let formData = new FormData();
      formData.append('attach', blob, random);
      formData.append('id', data.id)
      data.imgname_tmp = random;
      data.docname_tmp = '';
      this.presentLoading().then(preLoad => {
        this.httpPms.uploadPtw(formData).subscribe(res => {
          this.dismissloading();
          if (res.status) {
            this.common.presentToast(res.msg, 'success');
            data.ptw_attach = res.ptw_attach
            data.showPtw =  false
          } else {
            this.common.presentToast(res.msg, 'warning');
          }
        }, err => {
          data.imgname_tmp = ''
          this.dismissloading();
          this.common.presentToast(environment.errMsg, 'danger');
        });
      })
  }


  changeFile(fileChangeEvent: any, data: any){
    const photo = fileChangeEvent.target.files[0];
    let formData = new FormData();
      formData.append('attach', photo, photo.name);
      formData.append('id', data.id)
      data.imgname_tmp = '';
      data.docname_tmp = photo.name
      this.presentLoading().then(preLoad => {
        this.httpPms.uploadPtw(formData).subscribe(res => {
          this.dismissloading();
          if (res.status) {
            this.common.presentToast(res.msg, 'success');
            data.ptw_attach = res.ptw_attach
            data.showPtw = false
          } else {
            this.common.presentToast(res.msg, 'warning');
          }
        }, err => {
          this.dismissloading();
          this.common.presentToast(environment.errMsg, 'danger');
        });
      })
  }

  loadData(event: any, stage_id: any) {
    this.httpPms.getPm(stage_id, this.currentPage).subscribe({
      next:(dat) => {
        if (dat.status) {
          this.pmCal = dat.data.data;
          this.currentPage = this.currentPage + 1;
          if (stage_id == 1) {
            let obj;
            obj = this.pmCal.filter((val: any) => val.stage_id === 1);
            this.openPm = [...this.openPm, ...obj];
            this.openPmCopy = [...this.openPmCopy, ...obj];
          } else if (stage_id == 2) {
            let obj;
            obj = this.pmCal.filter((val: any) => val.stage_id === 2);
            this.actionPm = [...this.actionPm, ...obj];
            this.actionPmCopy = [...this.actionPmCopy, ...obj];
          } else if (stage_id == 3) {
            let obj;
            obj = this.pmCal.filter((val: any) => val.stage_id === 3);
            this.closePm = [...this.closePm, ...obj];
            this.closePmCopy = [...this.closePmCopy, ...obj];
          }
        } else {
          this.common.presentToast(dat.msg, 'warning');
        }
      },
      error:() => {
        event.target.complete();
        this.common.presentToast(environment.errMsg, 'danger');
      },
      complete:() => {
        event.target.complete();
      }
    });
  }

  searchItem(ev: any, val: any) {
    if (val == 1) {
      this.openPm = this.openPmCopy;
      this.openPm = this.openPm.filter((data: any) => {
        if ((data.pc_desc.toLowerCase().indexOf(ev.target.value.toLowerCase()) > -1)) {
          return (data.pc_desc.toLowerCase().indexOf(ev.target.value.toLowerCase()) > -1);
        } else if ((data.chklist_desc.toLowerCase().indexOf(ev.target.value.toLowerCase()) > -1)) {
          return (data.chklist_desc.toLowerCase().indexOf(ev.target.value.toLowerCase()) > -1);
        } else if ((data.wo_no.toLowerCase().indexOf(ev.target.value.toLowerCase()) > -1)) {
          return (data.wo_no.toLowerCase().indexOf(ev.target.value.toLowerCase()) > -1);
        } else if ((data.ro_cont_no.toLowerCase().indexOf(ev.target.value.toLowerCase()) > -1)) {
          return (data.ro_cont_no.toLowerCase().indexOf(ev.target.value.toLowerCase()) > -1);
        }  else if ((data.rgn_name.toLowerCase().indexOf(ev.target.value.toLowerCase()) > -1)) {
          return (data.rgn_name.toLowerCase().indexOf(ev.target.value.toLowerCase()) > -1);
        }
        return
      });
    } else if (val == 2) {
      this.actionPm = this.actionPmCopy;
      this.actionPm = this.openPm.filter((data: any) => {
        if ((data.pc_desc.toLowerCase().indexOf(ev.target.value.toLowerCase()) > -1)) {
          return (data.pc_desc.toLowerCase().indexOf(ev.target.value.toLowerCase()) > -1);
        } else if ((data.chklist_desc.toLowerCase().indexOf(ev.target.value.toLowerCase()) > -1)) {
          return (data.chklist_desc.toLowerCase().indexOf(ev.target.value.toLowerCase()) > -1);
        } else if ((data.wo_no.toLowerCase().indexOf(ev.target.value.toLowerCase()) > -1)) {
          return (data.wo_no.toLowerCase().indexOf(ev.target.value.toLowerCase()) > -1);
        } else if ((data.ro_cont_no.toLowerCase().indexOf(ev.target.value.toLowerCase()) > -1)) {
          return (data.ro_cont_no.toLowerCase().indexOf(ev.target.value.toLowerCase()) > -1);
        }  else if ((data.rgn_name.toLowerCase().indexOf(ev.target.value.toLowerCase()) > -1)) {
          return (data.rgn_name.toLowerCase().indexOf(ev.target.value.toLowerCase()) > -1);
        }
        return
      });
    } else if (val == 3) {
      this.closePm = this.closePmCopy;
      this.closePm = this.closePm.filter((data: any) => {
        if ((data.pc_desc.toLowerCase().indexOf(ev.target.value.toLowerCase()) > -1)) {
          return (data.pc_desc.toLowerCase().indexOf(ev.target.value.toLowerCase()) > -1);
        } else if ((data.chklist_desc.toLowerCase().indexOf(ev.target.value.toLowerCase()) > -1)) {
          return (data.chklist_desc.toLowerCase().indexOf(ev.target.value.toLowerCase()) > -1);
        } else if ((data.wo_no.toLowerCase().indexOf(ev.target.value.toLowerCase()) > -1)) {
          return (data.wo_no.toLowerCase().indexOf(ev.target.value.toLowerCase()) > -1);
        } else if ((data.ro_cont_no.toLowerCase().indexOf(ev.target.value.toLowerCase()) > -1)) {
          return (data.ro_cont_no.toLowerCase().indexOf(ev.target.value.toLowerCase()) > -1);
        }  else if ((data.rgn_name.toLowerCase().indexOf(ev.target.value.toLowerCase()) > -1)) {
          return (data.rgn_name.toLowerCase().indexOf(ev.target.value.toLowerCase()) > -1);
        }
        return
      });
    }
  }

  openViewReport(data: any) {
    this.router.navigate(['/pm-calibration/view-report'], {
      queryParams: {
        data: JSON.stringify(data),
      }
    });
  }

  openActionable(data: any) {
    this.router.navigate(['/pm-calibration/actionable'], {
      queryParams: {
        data: JSON.stringify(data),
      }
    });
  }

  openClose(data: any) {
    this.router.navigate(['/pm-calibration/close-pm'], {
      queryParams: {
        data: JSON.stringify(data),
      }
    });
  }

  openModal(data: any) {
    this.isPreOpen = true;
    this.selectedData = data;
    this.getPpmPending(this.selectedData.id);
  }

  onWillDismiss() {
    this.isPreOpen = false;
    this.selectedData = [];
    this.logs = [];
  }

  onWillDismissClose() {
    this.isCloseAction = false;
  }


  getPpmPending(id: any) {
    this.presentLoading().then(preLoad => {
      this.httpPms.PpmPtwApproval(id).subscribe({
        next:(data) => {
          if (data.status) {
            const tmp = data.data;
            for (var i = 0; i < tmp.length; i++) {
              let status = tmp[i].status_id;

              if(status !== ""){
                this.logs.push({
                  'status' :  (status == "0")?'Rejected':"Approved",
                  'status_id':tmp[i].status_id,
                  'date':tmp[i].appr_date,
                  'action_by':tmp[i].ap_username+' '+tmp[i].approver,
                  'remark':tmp[i].remark,
                  'attach':'',
                  // 'ind':i+2
                });
              }
              this.logs.push({
                'status' :  'Request Raised',
                'status_id':"",
                'date':tmp[i].created_at,
                'action_by':tmp[i].username+' '+tmp[i].creater,
                'remark':tmp[i].ptw_remark,
                'attach':tmp[i].ptw_attach,
                // 'ind':i+1
              });
            }

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
}
