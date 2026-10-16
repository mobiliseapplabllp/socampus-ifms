import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController, ModalController, Platform } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { LocationQrService } from 'src/app/provider/location-qr/location-qr.service';
import { CostCenterComponent } from 'src/app/shared/cost-center/cost-center.component';
import { BlockComponent } from 'src/app/shared/block/block.component';
import { BuildingComponent } from 'src/app/shared/building/building.component';
import { FloorComponent } from 'src/app/shared/floor/floor.component';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-location-qr',
  templateUrl: './location-qr.page.html',
  styleUrls: ['./location-qr.page.scss'],
})
export class LocationQrPage implements OnInit {
  segment = 'tag';
  tagStatus = '0';
  tagForm!: FormGroup;
  createForm!: FormGroup;
  locationArr: any = [];
  isSearched = false;
  qrAction: 'tag' | 'create' | null = null;
  selectedLoc: any = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private platform: Platform,
    private modalController: ModalController,
    private alertController: AlertController,
    private httpCommon: CommonService,
    private httpLocQr: LocationQrService
  ) { }

  ngOnInit() {
    this.tagForm = this.fb.group({
      pc_id: ['', Validators.required],
      pc_id_desc: [''],
      block_id: [''],
      block_id_desc: [''],
      bldg_id: [''],
      bldg_id_desc: [''],
      floor_id: [''],
      floor_id_desc: ['']
    });
    this.createForm = this.fb.group({
      pc_id: ['', Validators.required],
      pc_id_desc: [''],
      block_id: ['', Validators.required],
      block_id_desc: [''],
      bldg_id: ['', Validators.required],
      bldg_id_desc: [''],
      floor_id: ['', Validators.required],
      floor_id_desc: [''],
      location_desc: ['', [Validators.required, Validators.maxLength(100)]],
      location_description: ['', Validators.maxLength(300)]
    });
  }

  ionViewDidEnter() {
    let bar = this.httpCommon.getBarcode();
    if (bar && this.qrAction) {
      this.httpCommon.setBarcode('');
      let type, enc_key, split = bar.split('/');
      enc_key = split[split.length - 1];
      type = split[split.length - 2];
      // web me barcode component dummy asset QR deta hai, isliye type check sirf device par
      if (this.platform.is('capacitor') && type !== 'complaint-qr-code') {
        this.qrAction = null;
        this.selectedLoc = null;
        this.httpCommon.presentToast('Invalid QR code. Please scan a Location QR.', 'warning');
        return;
      }
      const action = this.qrAction;
      this.qrAction = null;
      this.confirmScan(action, enc_key);
    }
  }

  async confirmScan(action: 'tag' | 'create', enc_key: string) {
    let header, message;
    if (action === 'tag' && this.selectedLoc && this.selectedLoc.is_tagged) {
      header = 'Replace QR';
      message = '"' + this.selectedLoc.location_desc + '" is already tagged with QR-' + this.selectedLoc.qr_id + '. The old QR will be permanently deactivated and its sticker will stop working. Replace it with the scanned QR?';
    } else if (action === 'tag') {
      header = 'Tag QR';
      message = 'Tag the scanned QR to "' + this.selectedLoc.location_desc + '"?';
    } else {
      header = 'Create Location';
      message = 'Create location "' + this.createForm.value.location_desc.trim() + '" and tag the scanned QR to it?';
    }
    const alert = await this.alertController.create({
      cssClass: 'my-custom-class',
      header: header,
      message: message,
      mode: 'ios',
      buttons: [{
        text: 'Cancel',
        handler: (data) => {
          this.selectedLoc = null;
        }
      }, {
        text: 'Confirm',
        handler: (data) => {
          if (action === 'tag') {
            this.tagQr(enc_key);
          } else {
            this.createLocation(enc_key);
          }
        }
      }]
    });
    await alert.present();
  }

  changeTagStatus() {
    this.locationArr = [];
    // search ho chuki hai toh toggle badalte hi list auto-refresh, dubara Search nahi dabana padega
    if (this.isSearched && this.tagForm.value.pc_id) {
      this.searchLocations();
    } else {
      this.isSearched = false;
    }
  }

  ionViewDidLeave() {
    this.httpCommon.setBarcode('');
  }

  changeSegment(ev: any) {
    this.segment = ev.detail.value;
  }

  getForm(target: string): FormGroup {
    return target === 'tag' ? this.tagForm : this.createForm;
  }

  async openSiteModal(target: string) {
    const form = this.getForm(target);
    const modal = await this.modalController.create({
      component: CostCenterComponent,
      cssClass: 'my-modal',
      componentProps: { }
    });
    modal.onWillDismiss().then(disModal => {
      if (disModal.role) {
        form.get('pc_id_desc')?.setValue(disModal.data.label);
        form.get('pc_id')?.setValue(disModal.data.value);
        this.resetChildren(form, ['block', 'bldg', 'floor']);
        if (target === 'tag') {
          this.locationArr = [];
          this.isSearched = false;
        }
      }
    });
    return await modal.present();
  }

  async openBlockModal(target: string) {
    const form = this.getForm(target);
    if (!form.value.pc_id) {
      this.httpCommon.presentToast('Please Select Site', 'warning');
      return;
    }
    const modal = await this.modalController.create({
      component: BlockComponent,
      cssClass: 'my-modal',
      componentProps: {
        allData: { pc_id: form.value.pc_id }
      }
    });
    modal.onWillDismiss().then(disModal => {
      if (disModal.role) {
        form.get('block_id_desc')?.setValue(disModal.data.label);
        form.get('block_id')?.setValue(disModal.data.value);
        this.resetChildren(form, ['bldg', 'floor']);
      }
    });
    return await modal.present();
  }

  async openBuildingModal(target: string) {
    const form = this.getForm(target);
    if (!form.value.block_id) {
      this.httpCommon.presentToast('Please Select Block', 'warning');
      return;
    }
    const modal = await this.modalController.create({
      component: BuildingComponent,
      cssClass: 'my-modal',
      componentProps: {
        id: form.value.block_id
      }
    });
    modal.onWillDismiss().then(disModal => {
      if (disModal.role) {
        form.get('bldg_id_desc')?.setValue(disModal.data.label);
        form.get('bldg_id')?.setValue(disModal.data.value);
        this.resetChildren(form, ['floor']);
      }
    });
    return await modal.present();
  }

  async openFloorModal(target: string) {
    const form = this.getForm(target);
    if (!form.value.bldg_id) {
      this.httpCommon.presentToast('Please Select Building', 'warning');
      return;
    }
    const modal = await this.modalController.create({
      component: FloorComponent,
      cssClass: 'my-modal',
      componentProps: {
        bldg_id: form.value.bldg_id
      }
    });
    modal.onWillDismiss().then(disModal => {
      if (disModal.role) {
        form.get('floor_id_desc')?.setValue(disModal.data.label);
        form.get('floor_id')?.setValue(disModal.data.value);
      }
    });
    return await modal.present();
  }

  resetChildren(form: FormGroup, fields: string[]) {
    fields.forEach(field => {
      form.get(field + '_id')?.setValue('');
      form.get(field + '_id_desc')?.setValue('');
    });
  }

  searchLocations() {
    if (!this.tagForm.value.pc_id) {
      this.httpCommon.presentToast('Please Select Site', 'warning');
      return;
    }
    const obj = {
      pc_id: this.tagForm.value.pc_id,
      block_id: this.tagForm.value.block_id,
      building_id: this.tagForm.value.bldg_id,
      floor_id: this.tagForm.value.floor_id,
      tag_status: Number(this.tagStatus)
    };
    this.httpCommon.presentLoading().then(preLoad => {
      this.httpLocQr.getLocations(obj).subscribe({
        next: (data) => {
          this.isSearched = true;
          if (data.status) {
            this.locationArr = data.data;
          } else {
            this.locationArr = [];
            this.httpCommon.presentToast(data.msg, 'warning');
          }
        },
        error: () => {
          this.httpCommon.dismissloading();
          this.httpCommon.presentToast(environment.errMsg, 'danger');
        },
        complete: () => {
          this.httpCommon.dismissloading();
        }
      });
    });
  }

  openScannerForTag(loc: any) {
    this.selectedLoc = loc;
    this.qrAction = 'tag';
    this.router.navigateByUrl('/barcode');
  }

  openScannerForCreate() {
    if (this.createForm.invalid) {
      if (!this.createForm.value.pc_id) {
        this.httpCommon.presentToast('Please Select Site', 'warning');
      } else if (!this.createForm.value.block_id) {
        this.httpCommon.presentToast('Please Select Block', 'warning');
      } else if (!this.createForm.value.bldg_id) {
        this.httpCommon.presentToast('Please Select Building', 'warning');
      } else if (!this.createForm.value.floor_id) {
        this.httpCommon.presentToast('Please Select Floor', 'warning');
      } else if (!this.createForm.value.location_desc || !this.createForm.value.location_desc.trim()) {
        this.httpCommon.presentToast('Please Enter Location Name', 'warning');
      } else {
        this.httpCommon.presentToast('Location Name may not be greater than 100 characters', 'warning');
      }
      return;
    }
    this.qrAction = 'create';
    this.router.navigateByUrl('/barcode');
  }

  tagQr(enc_key: string) {
    const isReplace = this.selectedLoc.is_tagged;
    const obj = {
      pc_id: this.selectedLoc.pc_id,
      loc_id: this.selectedLoc.loc_id,
      qr_id: enc_key,
      req_type: isReplace ? 'replace' : 'new'
    };
    this.httpCommon.presentLoading().then(preLoad => {
      this.httpLocQr.tagQr(obj).subscribe({
        next: (data) => {
          if (data.status) {
            if (isReplace) {
              // replace ke baad location tagged hi rehti hai, card par naya QR number dikhana hai
              const row = this.locationArr.find((loc: any) => loc.loc_id === this.selectedLoc.loc_id);
              if (row) {
                row.qr_id = data.data.qr_id;
              }
            } else {
              this.locationArr = this.locationArr.filter((loc: any) => loc.loc_id !== this.selectedLoc.loc_id);
            }
            this.selectedLoc = null;
            this.httpCommon.presentToast(data.msg, 'success');
          } else {
            this.httpCommon.presentToast(data.msg, 'warning');
          }
        },
        error: () => {
          this.httpCommon.dismissloading();
          this.httpCommon.presentToast(environment.errMsg, 'danger');
        },
        complete: () => {
          this.httpCommon.dismissloading();
        }
      });
    });
  }

  createLocation(enc_key: string) {
    const obj = {
      pc_id: this.createForm.value.pc_id,
      block_id: this.createForm.value.block_id,
      building_id: this.createForm.value.bldg_id,
      floor_id: this.createForm.value.floor_id,
      location_desc: this.createForm.value.location_desc.trim(),
      location_description: this.createForm.value.location_description ? this.createForm.value.location_description.trim() : '',
      qr_id: enc_key
    };
    this.httpCommon.presentLoading().then(preLoad => {
      this.httpLocQr.createLocation(obj).subscribe({
        next: (data) => {
          if (data.status) {
            this.httpCommon.presentToast(data.msg, 'success');
            // site/block/building/floor waise hi rakhte hain taaki same floor par agli location jaldi ban sake
            this.createForm.get('location_desc')?.setValue('');
            this.createForm.get('location_description')?.setValue('');
          } else {
            this.httpCommon.presentToast(data.msg, 'warning');
          }
        },
        error: () => {
          this.httpCommon.dismissloading();
          this.httpCommon.presentToast(environment.errMsg, 'danger');
        },
        complete: () => {
          this.httpCommon.dismissloading();
        }
      });
    });
  }
}
