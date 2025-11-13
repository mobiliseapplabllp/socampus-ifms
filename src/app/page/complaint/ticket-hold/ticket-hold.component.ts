import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { CameraService } from 'src/app/provider/camera/camera.service';
import { CommonService } from 'src/app/provider/common/common.service';
import { ComplaintService } from 'src/app/provider/complaint/complaint.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-ticket-hold',
  templateUrl: './ticket-hold.component.html',
  styleUrls: ['./ticket-hold.component.scss'],
})
export class TicketHoldComponent  implements OnInit {
  formObj: any = {};
  pc_id: any;
  tkts_id: any;
  formData = new FormData();
  isModalOpen = false;    
  allArr: any = [];
  allArrCopy: any = [];
  // viewArr: any = [];  
  // externalArr: any = [];
  // sodexoArr: any = [];  
  currentModal!: string;
  hold_validation: any
  constructor(
    private modalCtrl: ModalController,
    private camera: CameraService,
    private httpComp: ComplaintService,
    private common: CommonService,        
  ) { }

  ngOnInit() {    
    console.log(this.hold_validation);
    this.formObj.pc_id = this.pc_id;
    this.formObj.tkts_id = this.tkts_id;
    this.formObj.source = environment.source,
    this.formObj.action_type = 'HOLD';
    this.common.presentLoading().then(preLoad => {
      this.httpComp.getInternalUser(this.pc_id).subscribe({
        next:(data: any) => {          
          if (data.status) {   
            this.allArr = data.data;   
            this.allArrCopy = data.data;
            // this.sodexoArr = structuredClone(data.data);
            // this.externalArr = structuredClone(data.data);
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
    });
    
  }

  closeModal(data: any, status: any) {
    this.modalCtrl.dismiss(data, status);
  }

  async presentActionSheet() {
    this.camera.selectImage(['camera', 'gallery'], (blob: any) => {
      let random = Date.now() + Math.floor(Math.random() * 90000) + 10000 + '.jpg';
      this.formData.delete('onHoldAttachments');
      this.formData.append('onHoldAttachments', blob, random);
      this.formObj.isImgUpload = true;
    });
  }

  openModal(type: string) {    
    // if (type === 'sodexo_user') {
    //   this.viewArr = [...this.sodexoArr];      
    // } else if (type === 'external_user') {        
    //   let internalArr = this.formObj.onHoldInternalUsers || [];      
    //   if (internalArr.length === 0) {
    //     this.common.presentToast('Please Select Sodexo Users', 'warning');
    //     return;
    //   }
    //   this.viewArr = this.externalArr.filter((val: any) => !internalArr.includes(val.value));      
    // }
    this.currentModal = type;
    this.isModalOpen = true;    
  }

  changeSearch(ev: any) {    
    const searchTerm = (ev.target.value || '').toLowerCase();
    this.allArr = this.allArrCopy;
    this.allArr = this.allArr.filter((dat: any) => {
      return (        
        String(dat?.label ?? '').toLowerCase().includes(searchTerm)        
      );
    });
  }

  done() {    
    this.isModalOpen = false;
    let internalArr = this.allArr.filter((val: any) => val.select_by === 'sodexo_user').map((item: any) => item.value) || [];
    let externalArr = this.allArr.filter((val: any) => val.select_by === 'external_user').map((item: any) => item.value) || [];    
    if (this.currentModal === 'sodexo_user') {
      this.formObj.onHoldInternalUsers = internalArr;
      this.formObj.onHoldInternalUsers_desc = internalArr.length + ' User Selected';      
    }
    if (this.currentModal === 'external_user') {
      this.formObj.onHoldExternalUsers = externalArr;
      this.formObj.onHoldExternalUsers_desc = externalArr.length + ' User Selected';          
    }    
  }

  changeCheckBox(dat: any, ev: any) {    
    if (ev.detail.checked) {
      dat.select_by = this.currentModal;
    } else {
      dat.select_by = ''
    }
  }

  // changeCheckBox(dat: any) {    
  //   let arr = this.viewArr.filter((val: any) => val.isSelect === true).map((item: any) => item.value);        
  //   if (this.currentModal === 'sodexo_user') {      
  //     this.formObj.onHoldInternalUsers = arr;
  //     this.formObj.onHoldInternalUsers_desc = arr.length + ' Users Selected';      
  //     for (var i = 0; i < this.externalArr.length;i++) {
  //       if (arr.includes(this.externalArr[i].value)) {
  //         this.externalArr[i].isSelect = false
  //       }
  //     }     
  //     if (this.formObj.onHoldExternalUsers && this.formObj.onHoldExternalUsers.length > 0) {
  //       this.formObj.onHoldExternalUsers = this.formObj?.onHoldExternalUsers?.filter((val: any) => !this.formObj.onHoldInternalUsers.includes(val)) || 0;
  //       this.formObj.onHoldExternalUsers_desc = this.formObj?.onHoldExternalUsers.length  + ' Users Selected';      
  //     }
      
  //   } else if (this.currentModal === 'external_user') {      
  //     this.formObj.onHoldExternalUsers = arr;
  //     this.formObj.onHoldExternalUsers_desc = arr.length + ' Users Selected';
  //     for (var i = 0; i < this.sodexoArr.length;i++) {
  //       if (arr.includes(this.sodexoArr[i].value)) {
  //         this.sodexoArr[i].isSelect = false
  //       }
  //     }      
  //     this.formObj.onHoldInternalUsers = this.formObj?.onHoldInternalUsers?.filter((val: any) => !this.formObj.onHoldExternalUsers.includes(val)) || 0;
  //     this.formObj.onHoldInternalUsers_desc = this.formObj?.onHoldInternalUsers.length  + ' Users Selected';      
  //   }    
    
  // }

  onWillDismiss() {
    this.isModalOpen = false;
    this.allArr = this.allArrCopy;    
    this.done();
  } 

  submit() {    
    console.log(this.formObj);
    if (!this.formObj.onHoldRemark) {
      this.common.presentToast('Please Enter Remark', 'warning');
      return;
    }

    // if (!this.formObj.isImgUpload) {
    //   this.common.presentToast('Please Add Attachment', 'warning');
    //   return;
    // }  

    if (this.hold_validation.is_sodexo_email_required === 1 && (!Array.isArray(this.formObj?.onHoldInternalUsers) || this.formObj?.onHoldInternalUsers.length === 0))  {
      this.common.presentToast('Please Select Sodexo Users', 'warning');
      return;
    }

    if (this.hold_validation.is_external_email_required === 1 && (!Array.isArray(this.formObj?.onHoldExternalUsers) || this.formObj?.onHoldExternalUsers.length === 0))  {
      this.common.presentToast('Please Select External Users', 'warning');
      return;
    }

    for (var key in this.formObj) {
      this.formData.delete(key);      
      if (Array.isArray(this.formObj[key])) {
        this.formData.append(key, JSON.stringify(this.formObj[key]));
      } else {
        this.formData.append(key, this.formObj[key]);
      }
    }
    this.common.presentLoading().then(preLoad => {
      this.httpComp.ticketHoldAction(this.formData).subscribe({
        next:(data: any) => {
          if (data.status) {
            this.common.presentToast(data.msg, 'success');            
            this.closeModal(null, 'true');
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
}
