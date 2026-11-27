import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ModalController, NavController } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { KeysService } from 'src/app/provider/keys/keys.service';
import { BlockComponent } from 'src/app/shared/block/block.component';
import { BuildingComponent } from 'src/app/shared/building/building.component';
import { CostCenterComponent } from 'src/app/shared/cost-center/cost-center.component';
import { FloorComponent } from 'src/app/shared/floor/floor.component';
import { LocationComponent } from 'src/app/shared/location/location.component';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-add-key',
  templateUrl: './add-key.component.html',
  styleUrls: ['./add-key.component.scss'],
})
export class AddKeyComponent implements OnInit {
  public forms!: FormGroup;
  selectedType: string = '';
  submitted = false;
  req_data: any = [];
  header = 'Add Key';
  constructor(
    private modalController: ModalController,
    private formbuilder: FormBuilder,
    private common: CommonService,
    private httpKeys: KeysService,
    private activeRoute: ActivatedRoute,
    private navCtrl: NavController
  ) { }

  ngOnInit() {     
    this.activeRoute.queryParams.subscribe((res:any) => {                  
      if (res.data) {
        this.req_data = JSON.parse(res.data);        
        this.header = 'Update Key'        
      } else {
        this.header = 'Add Key'
      }
    });    
    this.initForm();
  }

  initForm() {
    this.forms = this.formbuilder.group({
      keyName: [this.header === 'Update Key' ? this.req_data.key_name : '', Validators.required],      
      roomNumber: [this.header === 'Update Key' ? this.req_data.room_no : ''],
      siteId: [this.header === 'Update Key' ? this.req_data.site_id : ''],
      siteId_desc: [this.header === 'Update Key' ? this.req_data?.site?.pc_desc : '', Validators.required],
      blockId: [this.header === 'Update Key' ? this.req_data.block_id: ''],
      blockId_desc: [this.header === 'Update Key' ? this.req_data?.block?.block_name : '', Validators.required],
      buildingId: [this.header === 'Update Key' ? this.req_data.building_id : ''],
      buildingId_desc: [this.header === 'Update Key' ? this.req_data?.building?.building_name: '' , Validators.required],
      floorId: [this.header === 'Update Key' ? this.req_data.floor_id: '' ],
      floorId_desc: [this.header === 'Update Key' ? this.req_data?.floor?.floor_name: '' , Validators.required],            
      locationId: [this.header === 'Update Key' ? this.req_data.location_id: '' ],
      locationId_desc: [this.header === 'Update Key' ? this.req_data?.location?.location_desc:'' , Validators.required],
      remarks: [this.header === 'Update Key' ? this.req_data.remarks : ''],
      require_auth: [this.header === 'Update Key' ? this.req_data.require_auth : 0],
      require_auth_temp: [this.req_data.require_auth === 1 ? true : false]
    });
  }

  async openSiteModal() {    
    const modal = await this.modalController.create({
      component: CostCenterComponent,
      cssClass: 'my-modal',
      componentProps: { faciity_type: this.forms.value.faciity_type, isKey: true }
    });
    modal.onWillDismiss().then(disModal => {
      if (disModal.data) {
        this.forms.get('siteId_desc')?.setValue(disModal.data.pc_desc);
        this.forms.get('siteId')?.setValue(disModal.data.pc_id);
        this.forms.get('blockId_desc')?.setValue('');
        this.forms.get('blockId')?.setValue('');
        this.forms.get('buildingId_desc')?.setValue('');
        this.forms.get('buildingId')?.setValue('');
        this.forms.get('floorId_desc')?.setValue('');
        this.forms.get('floorId')?.setValue('');        
        this.forms.get('locationId_desc')?.setValue('');        
        this.forms.get('locationId')?.setValue('');        
              
      }
    });
    return await modal.present();
  }

  async openBlock() {
    if (!this.forms.value.siteId) {
      this.common.presentToast('Please Select PC', 'warning');
      return;
    }
    const obj = {
      pc_id: this.forms.value.siteId
    };
    const modal = await this.modalController.create({
      component: BlockComponent,
      cssClass: 'my-modal',
      componentProps: {
        allData: obj
      }
    });
    modal.onWillDismiss().then(disModal => {
      if (disModal.role) {        
        this.forms.get('blockId_desc')?.setValue(disModal.data.label);
        this.forms.get('blockId')?.setValue(disModal.data.value);
        this.forms.get('buildingId_desc')?.setValue('');
        this.forms.get('buildingId')?.setValue('');
        this.forms.get('floorId_desc')?.setValue('');
        this.forms.get('floorId')?.setValue('');      
        this.forms.get('locationId_desc')?.setValue(''); 
        this.forms.get('locationId')?.setValue(''); 
      }
    });
    return await modal.present();
  }

  async openBuilding() {
    if (!this.forms.value.blockId) {
      this.common.presentToast('Please Select Blocks', 'warning');
      return;
    }
    const modal = await this.modalController.create({
      component: BuildingComponent,
      cssClass: 'my-modal',
      componentProps: {
        id: this.forms.value.blockId
      }
    });
    modal.onWillDismiss().then(disModal => {
      if (disModal.role) {        
        this.forms.get('buildingId_desc')?.setValue(disModal.data.label);
        this.forms.get('buildingId')?.setValue(disModal.data.value);
        this.forms.get('floorId_desc')?.setValue('');
        this.forms.get('floorId')?.setValue('');      
        this.forms.get('locationId_desc')?.setValue(''); 
        this.forms.get('locationId')?.setValue(''); 
      }
    });
    return await modal.present();
  }

  async openFloorModal() {
    if (!this.forms.value.buildingId) {
      this.common.presentToast('Please Select Building', 'warning');
      return;
    }
    const modal = await this.modalController.create({
      component: FloorComponent,
      cssClass: 'my-modal',
      componentProps: {
        bldg_id: this.forms.value.buildingId
      }
    });
    modal.onWillDismiss().then(disModal => {
      if (disModal.role) {
        this.forms.get('floorId_desc')?.setValue(disModal.data.label);
        this.forms.get('floorId')?.setValue(disModal.data.value);      
        this.forms.get('locationId_desc')?.setValue(''); 
        this.forms.get('locationId')?.setValue(''); 
      }

    });
    return await modal.present();
  }

  async openLocationModal() {
    if (!this.forms.value.floorId) {
      this.common.presentToast('Please Select Floor', 'warning');
      return;
    }
    const modal = await this.modalController.create({
      component: LocationComponent,
      cssClass: 'my-modal',
      componentProps: {
        floor_id: this.forms.value.floorId,
        isKey: true
      }
    });
    modal.onWillDismiss().then(disModal => {
      if (disModal.role) {        
        this.forms.get('locationId_desc')?.setValue(disModal.data.label); 
        this.forms.get('locationId')?.setValue(disModal.data.value); 
      }

    });
    return await modal.present();
  }

  submitCondition() {
    if (this.header === 'Update Key') {
      this.updateKey();
    } else {
      this.submit();
    }
  }

  submit() {    
    this.submitted = true;
    if (this.forms.invalid) {
      this.common.presentToast('Please fill all the Mandatory fields', 'warning');
      return;
    }  

    const formData = new FormData();
    for (var key in this.forms.value) {
      formData.delete(key);
      formData.append(key, this.forms.value[key]);
    }
    this.common.presentLoading().then(preLoad => {
      this.httpKeys.addKey(this.forms.value).subscribe({
        next:(data: any) => {          
          if (data?.status === true) {
            this.httpKeys.setHomePageStatus(true);
            this.common.presentToast(data.msg || 'Key Added Successfully', 'success');
            this.submitted = false;
            this.forms.reset();
            this.forms.get('require_auth')?.setValue(0);
            this.navCtrl.pop();
          } else {
            this.common.presentToast(data.msg || 'Key not Added', 'warning');
          }
        },
        error:(err: any) => {          
          this.common.dismissloading();
          if (err.status === 400) {
            this.common.presentToast(err.error.message, 'warning');
            return;
          }          
          this.common.presentToast(environment.errMsg, 'danger');
        },
        complete:() => {
          this.common.dismissloading();
        }
      });    
    });    
  }

  updateKey() {    
    let updateVal = this.forms.value;
    updateVal.status = this.req_data.status;    
    this.common.presentLoading().then(preLoad => {
      this.httpKeys.updateKeys(this.req_data.id, updateVal).subscribe({
        next:(data: any) => {          
          if (data.status) {
            this.httpKeys.setHomePageStatus(true);
            this.common.presentToast(data.msg || 'Key Update Successfully', 'success');
            this.navCtrl.pop();
          } else {
            this.common.presentToast(data.msg || 'Key Not Updated', 'warning');
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

  changeCheckBox(ev: any) {
    let val = ev.detail.checked ? 1 : 0
    this.forms.get('require_auth')?.setValue(val);
  }
}
