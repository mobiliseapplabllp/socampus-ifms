import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LoadingController, ModalController, NavController, Platform } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { ComplaintService } from 'src/app/provider/complaint/complaint.service';
import { environment } from 'src/environments/environment';
import { ResponseModalComponent } from '../response-modal/response-modal.component';
import { CostCenterComponent } from '../../../shared/cost-center/cost-center.component';
import { Camera, CameraResultType } from '@capacitor/camera';
import { QueryCatComponent } from 'src/app/shared/query-cat/query-cat.component';
import { QuerySubCatComponent } from 'src/app/shared/query-sub-cat/query-sub-cat.component';
import { QuerySubCat2Component } from 'src/app/shared/query-sub-cat2/query-sub-cat2.component';
import { Router } from '@angular/router';
import { BuildingComponent } from 'src/app/shared/building/building.component';
import { FloorComponent } from 'src/app/shared/floor/floor.component';
import { LocationComponent } from 'src/app/shared/location/location.component';
@Component({
  selector: 'app-create-ticket',
  templateUrl: './create-ticket.component.html',
  styleUrls: ['./create-ticket.component.scss'],
})
export class CreateTicketComponent  implements OnInit {
  createForm!: FormGroup;
  formData = new FormData();
  isSpinner!: boolean;
  isImageUpload = false;
  loading: any;
  fileName: any;
  buildingArr: any = [];
  floorArr: any = [];
  locationArr: any = [];
  allIssueType: any = [];
  allRoName: any = [];
  allQueryCat: any = [];
  allSubCat1: any = [];
  allSubCat2: any = [];
  myCategory: any = [];
  isCordova!: boolean;
  userData: any = [];
  userName!: string;
  barcodeList: any = [];
  requestType: any = [];
  qrType!: string;
  isSearchBarcode!: boolean
  constructor(
    private platform: Platform,
    private formbuilder: FormBuilder,
    private httpComp: ComplaintService,
    private httpCommon: CommonService,
    private navCtrl: NavController,
    private modalController: ModalController,
    private loadingController: LoadingController,
    private router: Router
  ) { }

  ngOnInit() {
    this.httpCommon.setBarcode('');
    if (this.platform.is('capacitor')) {
      this.isCordova = true;
    } else {
      this.isCordova = false;
    }
    let temp = localStorage.getItem('user');
    if(temp) {
      this.userData = JSON.parse(temp);
    }
    this.userName = this.userData.user_name;
    this.getEmpDetail();
    this.initializeForm();
  }

  initializeForm() {
    this.createForm = this.formbuilder.group({
      usr_name: ['', Validators.required],
      mobile: [''],
      email: ['', Validators.required],
      issue_id: ['', Validators.required],
      req_type_id: ['', Validators.required],
      is_barcode: [''],
      barcode: [''],
      multi_barcode: [''],
      pc_id: [''],
      pc_id_desc: [''],
      bldg_id: [''],
      bldg_id_desc: [''],
      floor_id: [''],
      floor_id_desc: [''],
      loc_code: [''],
      loc_code_desc: [''],
      category_desc: [''],
      category: [''],
      subcat1_id_desc: [''],
      subcat1_id: [''],
      subcat2_id_desc: [''],
      subcat2_id: [''],
      priority: ['', Validators.required],
      remark: ['', Validators.required],
      source: [environment.source]
    });
    this.createForm.get('usr_name')?.setValue(this.userName);
    this.getIssueType();
  }

  ionViewDidEnter() {
    let bar = this.httpCommon.getBarcode();
    if (bar) {
      if (this.qrType === 'history') {
        let token, fullurl;
        token = localStorage.getItem('token1');
        fullurl = bar + '?token=' + token;
        this.httpCommon.setBarcode('');
        this.httpCommon.openDoc(fullurl);
      } else if (this.qrType === 'scan') {
        let  type,enc_key,split = bar.split('/');
        enc_key = split[split.length - 1];
        type = split[split.length - 2];
        if (type === 'complaint-qr-code') {
          this.getLocationQrData('location', enc_key);
        } else if(type === 'create-ticket-qr-code') {
          // this.decryptBarcode(enc_key)
          this.getLocationQrData('asset', enc_key);
        }
      }
    }
  }

  getLocationQrData(type: string, enc_key: string) {
    this.presentLoading().then(preLoad => {
      this.httpComp.getSiteDetailUsingBarcode(type, enc_key).subscribe({
        next:(data) => {
          if (data.status) {
            if (type === 'location') {
              this.createForm.get('issue_id')?.setValue(2);
              this.createForm.get('is_barcode')?.setValue('');
              this.createForm.get('barcode')?.setValue('');
              this.createForm.get('pc_id_desc')?.setValue(data.data.pc_desc);
              this.createForm.get('pc_id')?.setValue(data.data.pc_id);
              this.createForm.get('bldg_id_desc')?.setValue(data.data.building_desc);
              this.createForm.get('bldg_id')?.setValue(data.data.building_id);
              this.createForm.get('floor_id_desc')?.setValue(data.data.floor_desc);
              this.createForm.get('floor_id')?.setValue(data.data.floor_id);
              this.createForm.get('loc_code_desc')?.setValue(data.data.location_desc);
              this.createForm.get('loc_code')?.setValue(data.data.loc_id);
              this.barcodeList = [];
            } else if (type === 'asset') {
              this.createForm.get('issue_id')?.setValue(1);
              this.createForm.get('is_barcode')?.setValue('1');
              this.createForm.get('barcode')?.setValue(data.data.barcode);
              this.createForm.get('pc_id_desc')?.setValue(data.data.pc_desc);
              this.createForm.get('pc_id')?.setValue(data.data.pc_id);
              this.createForm.get('bldg_id_desc')?.setValue(data.data.building_desc);
              this.createForm.get('bldg_id')?.setValue(data.data.building_id);
              this.createForm.get('floor_id_desc')?.setValue(data.data.floor_desc);
              this.createForm.get('floor_id')?.setValue(data.data.floor_id);
              this.createForm.get('loc_code_desc')?.setValue(data.data.location_desc);
              this.createForm.get('loc_code')?.setValue(data.data.loc_id);
              setTimeout(() => {
                this.searchBarcode();
              }, 100);
            } else {
              this.httpCommon.presentToast('This is Asset QR Code', 'warning');
            }
          } else {
            this.httpCommon.presentToast(data.msg, 'warning');
          }
        },
        error:() => {
          this.dismissloading();
          this.httpCommon.presentToast(environment.errMsg, 'danger');
        },
        complete:() => {
          this.dismissloading();
        }
      })
    });
  }

  decryptBarcode(enc_key: string) {
    let decBarcode = this.httpCommon.decryptValue(enc_key);
    this.createForm.get('issue_id')?.setValue(1);
    this.createForm.get('is_barcode')?.setValue('1');
    this.createForm.get('barcode')?.setValue(decBarcode)
    setTimeout(() => {
      this.searchBarcode();
    }, 100);

  }

  getEmpDetail() {
    this.httpComp.getEmpDetail().subscribe(data => {
      if (data.status) {
        this.createForm.get('mobile')?.setValue(data.data.mobile);
        this.createForm.get('email')?.setValue(data.data.email);
      }
    });
  }

  getIssueType() {
    this.presentLoading().then(preLoad => {
      this.httpComp.getIssueType().subscribe(data => {
        this.dismissloading();
        if (data.status) {
          this.allIssueType = data.data;
        }
      });
    });
  }

  getRequestType(id: any) {
    this.presentLoading().then(preLoad => {
      this.httpComp.getRequestType(id).subscribe({
        next:(data) => {
          if (data.status) {
            this.requestType = data.data;
          } else {
            this.httpCommon.presentToast(data.msg, 'danger');
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

  openScanner(qrType: string) {
    this.qrType = qrType;
    this.router.navigateByUrl('/barcode');
  }

  getCategory() {
    this.httpComp.getCategory().subscribe(data => {
      if (data.status) {
        this.myCategory = data.data
      } else {
        this.httpCommon.presentToast(data.msg, 'warning');
      }
    });
  }

  getCostCenter() {
    this.httpComp.getCostCenter().subscribe(data => {
      if (data.status) {
        this.allRoName = data.data;
      }
    });
  }

  async openCategory() {
    if (!this.createForm.value.pc_id) {
      alert('Please Select Site');
      return;
    }
    const modal = await this.modalController.create({
      component: QueryCatComponent,
      cssClass: 'my-modal',
      componentProps : {
        issue_id: this.createForm.value.issue_id,
        pc_id: this.createForm.value.pc_id
      }
    });
    modal.onWillDismiss().then(disModal => {
      if (disModal.role) {
        this.createForm.get('category_desc')?.setValue(disModal.data.label);
        this.createForm.get('category')?.setValue(disModal.data.value);
        this.createForm.get('subcat1_id')?.setValue('');
        this.createForm.get('subcat1_id_desc')?.setValue('');
        this.createForm.get('subcat2_id')?.setValue('');
        this.createForm.get('subcat2_id_desc')?.setValue('');
        this.changeQuery(disModal.data.value);
      }
    });
    return await modal.present();
  }

  getQueryCategory() {
    if (!this.createForm.value.pc_id) {
      return
    }
    this.resetField();
    if (this.createForm.value.issue_id == 2 && this.createForm.value.pc_id) {
      this.presentLoading().then(preLoad => {
        this.httpComp.getQueryCategoryTicket(this.createForm.value.issue_id, this.createForm.value.pc_id).subscribe({
          next:(data) => {
            if (data.status) {
              this.allQueryCat = data.data;
            }
          },
          error:() => {
            this.dismissloading();
            this.httpCommon.presentToast(environment.errMsg, 'danger');
          },
          complete:() => {
            this.dismissloading();
          }
        })
      });
    }
  }

  changeIssue(ev: any) {
    // this.createForm.get('pc_id')?.setValue('');
    // this.createForm.get('pc_id_desc')?.setValue('');
    // this.createForm.get('bldg_id')?.setValue('');
    // this.createForm.get('floor_id')?.setValue('');
    // this.createForm.get('loc_code')?.setValue('');
    // this.createForm.get('pc_id_desc')?.setValue('');
    // this.createForm.get('bldg_id')?.setValue('');
    // this.createForm.get('floor_id')?.setValue('');
    // this.createForm.get('category_desc')?.setValue('');
    // this.createForm.get('subcat1_id_desc')?.setValue('');
    // this.createForm.get('subcat2_id_desc')?.setValue('');
    this.getRequestType(ev.target.value);
  }

  resetField() {
    this.createForm.get('is_barcode')?.setValue('');
    this.createForm.get('barcode')?.setValue('');
    this.createForm.get('category')?.setValue('');
    this.createForm.get('subcat1_id')?.setValue('');
    this.createForm.get('subcat2_id')?.setValue('');
  }

  async openCategorySubCat() {
    if(!this.createForm.value.category) {
      alert('Please Select Category');
      return;
    }
    const modal = await this.modalController.create({
      component: QuerySubCatComponent,
      cssClass: 'my-modal',
      componentProps : {
        qry_id: this.createForm.value.category,
        allData: this.allSubCat1,
      }
    });
    modal.onWillDismiss().then(disModal => {
      if (disModal.role) {
        this.createForm.get('subcat1_id_desc')?.setValue(disModal.data.label);
        this.createForm.get('subcat1_id')?.setValue(disModal.data.value);
        this.createForm.get('subcat2_id_desc')?.setValue('');
        this.createForm.get('subcat2_id')?.setValue('');
        this.allSubCat2 = [];
        this.changeSubCat(disModal.data.value);
      }
    });
    return await modal.present();
  }

  changeQuery(ev: any) {
    if (!ev) {
      return;
    }
    this.createForm.get('subcat1_id')?.setValue('');
    this.createForm.get('subcat2_id')?.setValue('');
    this.presentLoading().then(preLoad => {
      this.httpComp.getQuerySubCat1(ev).subscribe(data => {
        this.dismissloading();
        if (data.status) {
          this.allSubCat1 = data.data;
        }
      });
    });
  }

  async openCategorySubCat2() {
    if(!this.createForm.value.subcat1_id) {
      alert('Please Select Category 1');
      return;
    }
    const modal = await this.modalController.create({
      component: QuerySubCat2Component,
      cssClass: 'my-modal',
      componentProps : {
        qry_id1: this.createForm.value.subcat1_id,
        allData: this.allSubCat2,
      }
    });
    modal.onWillDismiss().then(disModal => {
      if (disModal.role) {
        this.createForm.get('subcat2_id_desc')?.setValue(disModal.data.label);
        this.createForm.get('subcat2_id')?.setValue(disModal.data.value);
      }
    });
    return await modal.present();
  }

  changeSubCat(ev: any) {
    if (!ev) {
      return;
    }
    this.createForm.get('subcat2_id')?.setValue('');
    this.presentLoading().then(preLoad => {
      this.httpComp.getQuerySubCat2(ev).subscribe(data => {
        this.dismissloading();
        if (data.status) {
          this.allSubCat2 = data.data;
        }
      });
    });
  }

  checkValidation() {
    if (this.createForm.value.issue_id == '1') {
      if (this.createForm.value.is_barcode) {
        if (this.createForm.value.is_barcode == '1') {

        }
      } else {
        alert('Please Select Barocde Yes Or No');
      }
    }
  }

  submit() {
    for (let key in this.createForm.value)  {
      if (!this.createForm.value[key]) {
        this.formData.delete(key);
        this.formData.append(key, '');
      } else {
        this.formData.delete(key);
        this.formData.append(key, this.createForm.value[key]);
      }
    }
    if (this.createForm.value.is_barcode == '1') {
      this.multiBarcodeTicketAction();
    } else {
      this.ticketAction();
    }
  }

  multiBarcodeTicketAction() {
    if (this.barcodeList.length == 0) {
      alert('Please Search Barcode First');
      return;
    }
    const arr = this.barcodeList.filter((val: any) => val.isSelected == true);
    if (arr.length == 0) {
      alert('Please Select at least one Barcode');
      return;
    }
    this.formData.delete('barcodes[]');
    for (var i =0; i < this.barcodeList.length; i++) {
      if (this.barcodeList[i].isSelected) {
        this.formData.append('barcodes[]', this.barcodeList[i].ext_asset_id);
      }
    }
    this.presentLoading().then(preLoad => {
      this.httpComp.createMultipleTicketAction(this.formData).subscribe(data => {
        this.dismissloading();
        if(data.status) {

          this.openResponseModal(data.resData);
        } else {
          this.httpCommon.presentToast(data.msg, 'warning');
        }
      });
    })
  }

  ticketAction() {
    this.presentLoading().then(preLoad => {
      this.httpComp.createTicketAction(this.formData).subscribe({
        next:(data) => {
          if (data.status) {
            this.httpCommon.presentToast(data.msg, 'success');
            this.navCtrl.pop();
          } else {
            this.httpCommon.presentToast(data.msg, 'warning');
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
    })
  }

  async openResponseModal(data: any) {
    const modal = await this.modalController.create({
      component: ResponseModalComponent,
      cssClass: 'my-modal2',
      componentProps : {data: JSON.stringify(data)}
    });
    modal.onWillDismiss().then(disModal => {
      this.navCtrl.pop();
      if (disModal.data) { }
    });
    return await modal.present();
  }


  async openCamera() {
    const takePicture = async () => {
      const image = await Camera.getPhoto({
        quality: 80,
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
    this.formData.delete('img[]');
    this.formData.append('img[]', blob, random);
    this.fileName = random
    this.presentLoading().then(preLoad => {
      this.dismissloading();
    })
  }

  changePhoto(event: any): void {
    if (event.target.files.length > 0) {
      let random = Date.now() + Math.floor(Math.random() * 90000) + 10000 + '.jpg'
      const file = event.target.files[0];
      this.formData.delete('img[]');
      this.formData.append('img[]', file, random);
      this.fileName = 'a.png';
    }
  }

  async presentLoading() {
    this.loading = await this.loadingController.create({
      cssClass: 'my-custom-class',
      message: 'Please wait...'
    });
    await this.loading.present();
  }

  async dismissloading() {
    this.loading.dismiss();
  }

  async openRoName() {
    const modal = await this.modalController.create({
      component: CostCenterComponent,
      cssClass: 'my-modal',
      componentProps : { }
    });
    modal.onWillDismiss().then(disModal => {
      if (disModal.role) {
        this.createForm.get('pc_id_desc')?.setValue(disModal.data.label);
        this.createForm.get('pc_id')?.setValue(disModal.data.value);

        this.createForm.get('bldg_id_desc')?.setValue('');
        this.createForm.get('bldg_id')?.setValue('');
        this.createForm.get('floor_id_desc')?.setValue('');
        this.createForm.get('floor_id')?.setValue('');
        this.createForm.get('loc_code_desc')?.setValue('');
        this.createForm.get('loc_code')?.setValue('');

        this.createForm.get('category_desc')?.setValue('');
        this.createForm.get('category')?.setValue('');
        this.createForm.get('subcat1_id_desc')?.setValue('');
        this.createForm.get('subcat1_id')?.setValue('');
        this.createForm.get('subcat2_id_desc')?.setValue('');
        this.createForm.get('subcat2_id')?.setValue('');
        // this.getBuilding(disModal.data.value);
      }
    });
    return await modal.present();
  }

  async openBuilding() {
    if (!this.createForm.value.pc_id) {
      this.httpCommon.presentToast('Please Select Site', 'warning');
      return;
    }
    const modal = await this.modalController.create({
      component: BuildingComponent,
      cssClass: 'my-modal',
      componentProps : {
        id: this.createForm.value.pc_id
      }
    });
    modal.onWillDismiss().then(disModal => {
      if (disModal.role) {
        this.createForm.get('bldg_id_desc')?.setValue(disModal.data.label);
        this.createForm.get('bldg_id')?.setValue(disModal.data.value);

        this.createForm.get('floor_id_desc')?.setValue('');
        this.createForm.get('floor_id')?.setValue('');
        this.createForm.get('loc_code_desc')?.setValue('');
        this.createForm.get('loc_code')?.setValue('');

        this.createForm.get('category_desc')?.setValue('');
        this.createForm.get('category')?.setValue('');
        this.createForm.get('subcat1_id_desc')?.setValue('');
        this.createForm.get('subcat1_id')?.setValue('');
        this.createForm.get('subcat2_id_desc')?.setValue('');
        this.createForm.get('subcat2_id')?.setValue('');
        // this.getBuilding(disModal.data.value);
      }
    });
    return await modal.present();
  }



  // getBuilding(id: any) {
  //   this.presentLoading().then(preLoad => {
  //     this.httpComp.getBuildingList(id).subscribe({
  //       next:(data: any) => {
  //         if (data.status) {
  //           this.buildingArr = data.data;
  //         } else {
  //           this.httpCommon.presentToast(data.msg, 'warning');
  //         }
  //       },
  //       error:() => {
  //         this.dismissloading();
  //         this.httpCommon.presentToast(environment.errMsg, 'danger');
  //       },
  //       complete:() => {
  //         this.dismissloading();
  //       }
  //     })
  //   })
  // }

  // changeBuilding(ev: any) {
  //   let id = ev.target.value;
  //   if(!id) {
  //     return;
  //   }
  //   this.getFloorList(id)
  // }

  // getFloorList(id: any) {
  //   this.presentLoading().then(preLoad => {
  //     this.httpComp.getFloorList(id).subscribe({
  //       next:(data: any) => {
  //         if (data.status) {
  //           this.floorArr = data.data;
  //         } else {
  //           this.httpCommon.presentToast(data.msg , 'warning');
  //         }
  //       },
  //       error:() => {
  //         this.dismissloading();
  //         this.httpCommon.presentToast(environment.errMsg, 'danger');
  //       },
  //       complete:() => {
  //         this.dismissloading();
  //       }
  //     })
  //   })
  // }

  async openFloorModal() {
    if (!this.createForm.value.bldg_id) {
      this.httpCommon.presentToast('Please Select Building', 'warning');
      return;
    }
    const modal = await this.modalController.create({
      component: FloorComponent,
      cssClass: 'my-modal',
      componentProps : {
        bldg_id: this.createForm.value.bldg_id
      }
    });
    modal.onWillDismiss().then(disModal => {
      if (disModal.role) {
        this.createForm.get('floor_id_desc')?.setValue(disModal.data.label);
        this.createForm.get('floor_id')?.setValue(disModal.data.value);

        this.createForm.get('loc_code_desc')?.setValue('');
        this.createForm.get('loc_code')?.setValue('');
        // this.createForm.get('loc_id')?.setValue('');
        // this.createForm.get('loc_id_desc')?.setValue('')
      }

    });
    return await modal.present();
  }


  // changeFloor(ev: any) {
  //   let id = ev.target.value;
  //   if (!id) {
  //     return;
  //   }
  //   this.getLocation(id);
  // }

  // getLocation(id: any) {
  //   this.presentLoading().then(preLoad => {
  //     this.httpComp.getLocationList(id).subscribe({
  //       next:(data) => {
  //         if (data.status) {
  //           this.locationArr = data.data
  //         } else {
  //           this.httpCommon.presentToast(data.msg, 'warning');
  //         }
  //       },
  //       error:() => {
  //         this.dismissloading();
  //         this.httpCommon.presentToast(environment.errMsg, 'danger');
  //       },
  //       complete:() => {
  //         this.dismissloading();
  //       }
  //     })
  //   })
  // }

  async openLocationModal() {
    if (!this.createForm.value.floor_id) {
      this.httpCommon.presentToast('Please Select Floor', 'warning');
      return;
    }
    const modal = await this.modalController.create({
      component: LocationComponent,
      cssClass: 'my-modal',
      componentProps : {
        floor_id: this.createForm.value.floor_id
      }
    });
    modal.onWillDismiss().then(disModal => {
      if (disModal.role) {
        this.createForm.get('loc_code_desc')?.setValue(disModal.data.label);
        this.createForm.get('loc_code')?.setValue(disModal.data.value);
      }

    });
    return await modal.present();
  }

  searchBarcode() {
    if(!this.createForm.value.barcode) {
      this.httpCommon.presentToast('Please Enter Barcode No', 'warning');
      return;
    }
    this.isSearchBarcode = true;
    this.httpComp.getClientIdBarcode(this.createForm.value.barcode).subscribe({
      next:(data) => {
        if (data.status) {
          this.barcodeList = data.data;
        } else {
          this.httpCommon.presentToast(data.msg, 'warning');
        }
      },
      error:() => {
        this.isSearchBarcode = false;
        this.dismissloading();
        this.httpCommon.presentToast(environment.errMsg, 'danger');
      },
      complete:() => {
        this.isSearchBarcode = false;
        this.dismissloading();
      }
    });
  }

  submitTest() {
    for (var i =0; i < this.barcodeList.length; i++) {
      if (this.barcodeList[i].isSelected) {
        this.formData.append('barcodes[]', this.barcodeList[i].ext_asset_id);
      }
    }
  }

  changeHasBarcode() {
    this.barcodeList = [];
  }

}
