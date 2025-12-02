import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ActionSheetController, AlertController, ModalController, NavController, Platform } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { ComplaintService } from 'src/app/provider/complaint/complaint.service';
import { environment } from 'src/environments/environment';
import { AssignTicketComponent } from '../assign-ticket/assign-ticket.component';
import { SignatureComponent } from 'src/app/shared/signature/signature.component';
import { InstructionModalComponent } from '../instruction-modal/instruction-modal.component';
import { MediaCapture, CaptureVideoOptions } from '@awesome-cordova-plugins/media-capture/ngx';
import { Filesystem } from '@capacitor/filesystem';
import { CaptureComponent } from 'src/app/shared/capture/capture.component';
import { CameraService } from 'src/app/provider/camera/camera.service';
import { TicketHoldComponent } from '../ticket-hold/ticket-hold.component';

@Component({
  selector: 'app-ticket-work',
  templateUrl: './ticket-work.component.html',
  styleUrls: ['./ticket-work.component.scss'],
})
export class TicketWorkComponent  implements OnInit {
  segmentStatus = 'ticket';
  public workSpace!: FormGroup;
  assetInfo: any = {};
  ticketStages: any = [];
  loading: any;
  formData:any = new FormData();
  fileName!: string;
  ppeFileName!: string;
  isSpinner!: boolean;
  isImageUpload!: boolean;
  ticket_id: any;
  result:any = [];
  isOtpSent!: boolean;
  isVerifyOtp = false;
  requestedData: any = [];
  requestedData_TEMP: any = [];
  mobile: any;
  hasWip: any;
  countStatus = false;
  countTime!: number;
  mm!: number;
  ss!: number;
  myinterval!: any;
  defaultCountTime = 300;
  engSigImg!: string;
  cusSigImg!: string;
  engineerBase64!: string;
  customerBase64!: string;
  enter_otp: any;
  isFormDisabled!: boolean;
  ticketPriority: any = [];
  isPriority: any;
  changePriorityObj: any = {};
  isPtwMandatory!: boolean;
  arr: any = [];
  scopeOfWorkArr: any = [];
  isVidUpl!: boolean;
  selectedFile: any;

  videoBlob: Blob | null = null;
  compressedVideoUrl: string | null = null;  
  canHoldTicket!: boolean;
  canUnHoldticket!: boolean;
  canCreateIndent!: boolean;
  constructor(
    private activeRoute: ActivatedRoute,
    private formbuilder: FormBuilder,
    private httpComplaint: ComplaintService,
    private httpCommon: CommonService,
    private alertCtrl: AlertController,
    private navCtrl: NavController,
    private modalCtrl: ModalController,
    private actionSheetController: ActionSheetController,
    private router: Router,
    private mediaCapture: MediaCapture,
    private modalController: ModalController,
    private camera: CameraService
  ) { }

  ngOnInit() {
    this.activeRoute.queryParams.subscribe((res) => {
      this.requestedData_TEMP = JSON.parse(res['data']);                  
      // <ion-button expand="block" shape="round" color="tertiary" class="ion-text-capitalize" *ngIf="requestedData_TEMP?.pi_action_permision?.can_hold_ticket" (click)="openTicketHold()">Place on Hold</ion-button>
      // <ion-button expand="block" shape="round" color="success" class="ion-text-capitalize" *ngIf="requestedData_TEMP?.pi_action_permision?.is_ticket_on_hold" (click)="presentAlertConfirm()">Remove on Hold</ion-button>

      this.canHoldTicket = this.requestedData_TEMP?.pi_action_permision?.can_hold_ticket;
      this.canUnHoldticket = this.requestedData_TEMP?.pi_action_permision?.is_ticket_on_hold;
      // tktStatus == 3 && this.ticketData.tkts_asset_id != null && this.ticketData.tkts_asset_id != 0 && action_permission.can_perform_pi_action
      this.canCreateIndent = this.requestedData_TEMP?.data?.tkts_asset_id !== null && this.requestedData_TEMP?.data?.tkts_asset_id !== 0 && this.requestedData_TEMP?.pi_action_permision.can_perform_pi_action;
      console.log(this.canCreateIndent);
      this.requestedData = this.requestedData_TEMP.data;      
      this.ticket_id = this.requestedData.tkts_id;
      this.mobile = this.requestedData.mobile
      this.initForm();
    });
    this.getTicketStages();
  }

  initForm() {
    this.workSpace = this.formbuilder.group({
      status: ['' , Validators.required],
      remark: [''],
      source: [environment.source],
      ticketId: [this.ticket_id],
      problem_reported: [''],
      action_taken: [''],
      scope_of_work: [''],
      phone_no: [''],
      otp: [''],
    });
  }

  testOtp() {
    this.workSpace.get('enter_otp')?.setValue('');
  }

  changePhoto(event: any): void {
    this.fileName = '';
    let random = Date.now() + Math.floor(Math.random() * 90000) + 10000 + '.jpg'
    if (event.target.files.length > 0) {
      const file = event.target.files[0];
      this.formData.delete('img[]');
      this.formData.append('img[]', file, random);
      this.fileName = random;
      this.isOtpSent = false;
      this.httpCommon.presentLoading().then(preLoad => {
        this.httpCommon.dismissloading();
      });
    }
  }

  getSpecificTicket(ticket_id: any) {
    this.httpCommon.presentLoading().then(preLoad => {
      this.httpComplaint.getSpecificTicket(ticket_id).subscribe({
        next:(data) => {
          if (data.status) {
            this.arr = data.data;
            this.isPriority = data.can_priority;
            this.isPtwMandatory = data.ptw_mandatory;
            this.ticketPriority = data.priority_list;
            this.formData.delete('ptwApproved');
            this.formData.append('ptwApproved', data.data.ptwApproved);
            this.formData.delete('pc_id');
            this.formData.append('pc_id', data.data.pc_id);
            if (this.arr.hasWIP == 1 && data.data.ptwApproved == 0 && data.ptwPending == true ) {
              this.isFormDisabled = true;
            } else {
              this.isFormDisabled = false;
            }
            if (this.isPtwMandatory) {
              if ((this.arr.hasWIP == 0 || this.arr.ptwApproved == 0)) {
                this.ticketStages = this.ticketStages.filter((val: any) => val.stage_id != 4);
              }
            } else {
              if ((this.arr.hasWIP == 0)) {
                this.ticketStages = this.ticketStages.filter((val: any) => val.stage_id != 4);
              }
            }
            if (data.data.assets) {
              this.assetInfo = data.data.assets;
            }
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

  async presentAlert(ev: any) {
    if (ev.target.value == this.arr.tkt_priority_id) {
      return;
    }
    const confirm = await this.alertCtrl.create({
      message: 'Are you Sure want to Confirm',
      buttons: [{
        text: 'Disagree',
        handler: () => {}
      }, {
        text: 'Agree',
        handler: () => {
          this.changePriority(ev)
        }
      }]
    });
    await confirm.present();
  }

  async changeFile(ev: any) {
    if (ev.target.files.length > 0) {
      this.formData.delete('video');
      this.formData.append('video', ev.target.files[0], ev.target.files[0].name);
      this.isVidUpl = true;
    }
  }

  changePriority(ev: any) {
    const obj = {
      id: ev.target.value,
      ticket_id: this.ticket_id,
    }
    this.httpCommon.presentLoading().then(preLoad => {
      this.httpComplaint.changePriority(obj).subscribe({
        next:(data) => {
          if (data.status) {
            this.httpCommon.presentToast(data.msg, 'success');
            this.arr.attend_time = data.data.attend_time;
            this.arr.resolve_time = data.data.resolve_time;
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

  async customActionSheet() {
    const actionSheet = await this.actionSheetController.create({
      header: 'Choose Video Option',
      mode: 'ios',
      buttons: [{
        text: 'Record Video',
        handler:() => {
          this.openCapture();
        }
      }, {
        text: 'Upload Video',
        handler:() => {
          document.getElementById('choose-file')?.click();
        }
      }],
    });

    await actionSheet.present();
  }



  getPriority() {
    this.httpComplaint.getTicketPriority(this.ticket_id).subscribe({
      next:(data) => {
        if (data.status) {
          this.ticketPriority = data.data;
        } else {
          this.httpCommon.presentToast(data.msg, 'warning');
        }
      },
      error:() => {
        this.httpCommon.presentToast(environment.errMsg, 'danger');
      },
      complete:() => {
        this.httpCommon.dismissloading();
      }
    });
  }

  getTicketStages() {
    this.httpCommon.presentLoading().then(preLoad => {
      this.httpComplaint.getTicketStages().subscribe(data => {
        this.httpCommon.dismissloading();
        if (data.status) {
          this.ticketStages = data.data;

          this.arr = this.requestedData;
          this.isPriority = this.requestedData_TEMP.can_priority;
          this.isPtwMandatory = this.requestedData.ptw_mandatory;
          this.ticketPriority = this.requestedData_TEMP.priority_list;
          this.formData.delete('ptwApproved');
          this.formData.append('ptwApproved', this.requestedData.ptwApproved);
          this.formData.delete('pc_id');
          this.formData.append('pc_id', this.requestedData.pc_id);
          if (this.arr.hasWIP == 1 && this.arr.ptwApproved == 0 && this.arr.ptwPending == true ) {
            this.isFormDisabled = true;
          } else {
            this.isFormDisabled = false;
          }
          if (this.isPtwMandatory) {
            if ((this.arr.hasWIP == 0 || this.arr.ptwApproved == 0)) {
              this.ticketStages = this.ticketStages.filter((val: any) => val.stage_id != 4);
            }
          } else {
            if ((this.arr.hasWIP == 0)) {
              this.ticketStages = this.ticketStages.filter((val: any) => val.stage_id != 4);
            }
          }
          if (this.arr.assets) {
            this.assetInfo = data.data.assets;
          }

          setTimeout(() => {
            this.workSpace.get('status')?.setValue(3);
            if (this.requestedData_TEMP?.pi_action_permision?.is_ticket_on_hold || this.requestedData_TEMP?.pi_action_permision?.ticket_is_on_hold_process) {
              this.workSpace.disable();
            }      
          }, 1000);
        }
      });
    })
  }
  segmentChanged(ev: any) {
    if(ev.target.value === 'asset') { }
  }

  checkHasWip() {
    if (this.arr.hasWIP == 0) {
      this.openInstructionModal();
    } else {
      this.submitTicket();
    }
  }

  async openTicketHold() {
    const modal = await this.modalCtrl.create({
      component: TicketHoldComponent,
      cssClass: 'my-modal_',
      backdropDismiss:false,
      componentProps: { 
        pc_id: this.requestedData_TEMP.data.pc_id,
        tkts_id: this.requestedData_TEMP.data.tkts_id,
        hold_validation: this.requestedData_TEMP.pi_action_permision?.hold_validation
      }
    });    
    modal.onWillDismiss().then(disModal => {
      if (disModal.role == 'true') {
        this.workSpace.disable();         
        // this.requestedData_TEMP.pi_action_permision.can_hold_ticket = false;
        this.canHoldTicket = !this.canHoldTicket;
        this.canUnHoldticket = !this.canUnHoldticket;
      }
    });
    modal.present();
  }

  async openInstructionModal() {
    const modal = await this.modalCtrl.create({
      component: InstructionModalComponent,
      cssClass: 'my-modal',
      backdropDismiss:false,
      componentProps: { }
    });
    modal.onWillDismiss().then(disModal => {
      if (disModal.role == 'true') {
        this.submitTicket();
      }
    });
    modal.present();
  }

  submitTicket() {
    for(let key in this.workSpace.value) {
      this.formData.delete(key);
      this.formData.append(key, this.workSpace.value[key]);
    }

    this.formData.delete('ptwApproved')
    this.formData.delete('ptwPending')
    this.formData.delete('ptw_mandatory')
    this.formData.delete('ppekitFilled')
    this.formData.delete('ppekit_mandatory')

    this.formData.append('ptwApproved', this.requestedData.ptwApproved)
    this.formData.append('ptwPending', this.requestedData.ptwPending)
    this.formData.append('ptw_mandatory', this.requestedData.ptw_mandatory)
    this.formData.append('ppekitFilled', this.requestedData.ppekitFilled)
    this.formData.append('ppekit_mandatory', this.requestedData.ppekit_mandatory)

    if (this.workSpace.value.status == 4) {
      if (this.arr.tkts_issue_id == 1 && !this.isVerifyOtp) {
        this.httpCommon.presentToast('OTP is Mandatory for Asset Ticket', 'warning');
        return;
      }
      if (!this.fileName && !this.isVerifyOtp) {
        this.httpCommon.presentToast('Please Add Attachment or Verify OTP to resolve Ticket', 'warning');
        return
      }
      if (!this.workSpace.value.problem_reported) {
        this.httpCommon.presentToast('Please Enter Problem Reported By Customer', 'warning');
        return;
      }
      if (!this.workSpace.value.action_taken) {
        this.httpCommon.presentToast('Plese Enter Action Taken By Engineer', 'warning');
        return;
      }
      if (!this.workSpace.value.scope_of_work) {
        this.httpCommon.presentToast('Please Select Scope of Work', 'warning');
        return;
      }
      this.formData.delete('remark');
      this.formData.append('remark', this.workSpace.value.action_taken);
      this.formData.delete('otpVerify');
      this.formData.append('otpVerify', this.isVerifyOtp);
    }

    if(this.workSpace.value.status == 3 && !this.fileName && this.arr.hasWIP == 0 && this.isPtwMandatory) {
      alert('Opps you have not attached PTW document');
      return;
    }

    if (this.workSpace.value.status === 3 && this.requestedData.ppekit_mandatory && !this.requestedData.ppekitFilled && !this.ppeFileName) {
      alert('Opps you have not attached PPE kit selfie.');
      return;
    }

    this.httpCommon.presentLoading().then(preLoad => {
      this.httpComplaint.submitTicketTransaction(this.formData).subscribe({
        next:(data) => {
          if (data.status) {
            if (this.workSpace.value.status == 4) {
              this.httpCommon.setHomeLoadStatus(true);
            }
            this.httpCommon.presentToast(data.msg, 'success');
            this.navCtrl.pop();
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
    })
  }

  async captureAndUploadVideo() {
    let options: CaptureVideoOptions = { limit: 1, quality:0, duration: 60};
    this.mediaCapture.captureVideo(options).then(async (_data: any) => {
      this.getVideoUrl(_data[0].fullPath);
    }, _err => {

    });
  }

  async getVideoUrl(fullPath: string) {
    let random = Date.now() + Math.floor(Math.random() * 90000) + 10000 + '.mp4'
    const file = await Filesystem.readFile({
      path: fullPath,
    });

    this.httpCommon.presentLoading().then(async preLoad => {
      const base64Video = `data:video/mp4;base64,${file.data}`
      const base64Response = await fetch(base64Video);
      const blob = await base64Response.blob();
      this.formData.delete('video');
      this.formData.append('video', blob, random);
      this.isVidUpl = true;
      this.httpCommon.dismissloading();
    })

}

  async assignTicket() {
    const modal = await this.modalCtrl.create({
      component: AssignTicketComponent,
      cssClass: 'my-modal',
      componentProps: {
        ticket_id: this.ticket_id,
        allData: this.requestedData
      }
    });
    modal.onWillDismiss().then(async disModal => {
      if (disModal.role) {
        this.navCtrl.pop();
      }
    });
    modal.present();
  }

  changeStatus(ev: any) {
    if (ev.target.value === 'assign') {
      this.assignTicket();
      return;
    }
    if (ev.target.value === 4 && this.scopeOfWorkArr.length == 0) {
      this.getScopeOfWork();
    }
    this.workSpace.get('remark')?.setValue('');
    this.workSpace.get('problem_reported')?.setValue('');
    this.workSpace.get('action_taken')?.setValue('');
    this.workSpace.get('phone_no')?.setValue('');
    this.workSpace.get('otp')?.setValue('');
  }

  getScopeOfWork() {
    this.httpCommon.presentLoading().then(preLoad => {
      this.httpComplaint.getScopeOfWork().subscribe({
        next:(data) => {
          if (data.status) {
            this.scopeOfWorkArr = data.data;
          } else {
            this.httpCommon.presentToast(data.msg, 'warning');
          }
        },
        error:() => {
          this.httpCommon.presentToast(environment.errMsg, 'danger');
        },
        complete:() => {
          this.httpCommon.dismissloading();
        }
      })
    });
  }

  submit() {
  }

  changeEmp(ev: any) {
  }

  async presentActionSheet(val: string) {
    this.camera.selectImage(['camera', 'gallery'], (blob: Blob) => {
      this.readImg(blob, val);
    });
  }

  async readImg(photo: any, val: string) {
    let random = Date.now() + Math.floor(Math.random() * 90000) + 10000 + '.jpg'
    if (val === 'image') {
      this.formData.delete('img[]');
      this.formData.append('img[]', photo, random);
      this.fileName = random;
    } else if (val === 'ppe') {
      this.formData.delete('ppeKitAttach');
      this.formData.append('ppeKitAttach', photo, random);
      this.ppeFileName = random;
    }

    this.httpCommon.presentLoading().then(preLoad => {
      this.httpCommon.dismissloading()
    })
  }

  viewAttachment(img: string) {
    this.httpCommon.openDoc(img);
  }

  sendOtp() {
    const obj = {
      phone_no: this.mobile,
      ticket_id: this.ticket_id
    }
    this.httpCommon.presentLoading().then(preLoad => {
      this.isOtpSent = false;
      this.httpComplaint.otpSend(obj).subscribe(data => {
        this.httpCommon.dismissloading();
        if (data.status) {
          this.httpCommon.presentToast(data.msg, 'success');
          this.isOtpSent = true;
          this.countTimefun();
        } else {
          this.httpCommon.presentToast(data.msg, 'warning');
          this.isOtpSent = false;
        }
      });
    })
  }

  verifyOtp() {
    const obj = {
      otp: this.workSpace.value.otp,
      ticket_id: this.ticket_id
    }
    this.httpCommon.presentLoading().then(preLoad => {
      this.httpComplaint.verify_otp(obj).subscribe(data => {
        this.httpCommon.dismissloading();
        if (data.status) {
          this.httpCommon.presentToast(data.msg, 'success');
          this.isVerifyOtp = true;
        } else {
          this.httpCommon.presentToast(data.msg, 'warning');
          this.isVerifyOtp = false;
        }
      })

    })
  }

  changeClosure() {

  }

  createIndent() {
    this.router.navigate(['/create-indent'], {
      queryParams: {
        data: JSON.stringify(this.requestedData),
      }
    });
  }

  async openCapture() {
    if (!this.workSpace.value.remark) {
      this.httpCommon.presentToast('Please Enter Remark', 'warning');
      return;
    }
    this.requestedData.remark = this.workSpace.value.remark
    const modal = await this.modalController.create({
      component: CaptureComponent,
      componentProps : {
        requestedData: this.requestedData
      }
    });
    modal.onWillDismiss().then(disModal => {
      if (disModal.role) {

      }
    });
    return await modal.present();
  }


  async openSign(data: any) {
    const modal = await this.modalCtrl.create({
      component: SignatureComponent,
      cssClass: 'my-modal',
      componentProps: { requestData: data }
    });
    modal.onWillDismiss().then(async disModal => {

      if (disModal.role) {
        let random = Date.now() + Math.floor(Math.random() * 90000) + 10000 + '.jpg';
        if (data === 'engineer') {
          this.engSigImg = 'Uploaded';
          this.engineerBase64 = disModal.data;
          const base64Response = await fetch(disModal.data);
          const blob = await base64Response.blob();
          this.formData.delete('customer_signature');
          this.formData.append('customer_signature', blob, random);
        } else if (data === 'customer') {
          this.cusSigImg = 'Uploaded';
          this.customerBase64 = disModal.data;
          const base64Response = await fetch(disModal.data);
          const blob1 = await base64Response.blob();
          this.formData.delete('engineer_signature');
          this.formData.append('engineer_signature', blob1, random);
        }
      }
    });
    modal.present();
  }

  countTimefun() {
    this.countTime = this.defaultCountTime;
    clearInterval(this.myinterval);
    this.myinterval = setInterval(() => {
      this.countTime--;
      this.mm = Math.floor(this.countTime / 60);
      this.ss = this.countTime % 60;
      if (this.countTime === 0) {
        this.resetVariable();
      }
    }, 1050);
  }

  resetVariable() {
    this.countTime = this.defaultCountTime;
    this.isOtpSent = false;
    this.isVerifyOtp = false;

    clearInterval(this.myinterval);
  }

  changeNgOtp(ev: any) {
    this.workSpace.get('otp')?.setValue(ev);
  }

  resetOtp() {
    this.isOtpSent = false;
    this.isVerifyOtp = false;
  }

  openRoute(url: string) {    
    this.router.navigate([url], {
      state: {
        data: this.requestedData_TEMP
      }
    });
  }

  async presentAlertConfirm() {
    const alert = await this.alertCtrl.create({
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
              tkts_id: this.ticket_id,
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
      this.httpComplaint.ticketHoldAction(obj).subscribe({
        next:(data: any) => {
          if (data.status) {
            this.canHoldTicket = !this.canHoldTicket;
            this.canUnHoldticket = !this.canUnHoldticket;
            this.httpCommon.presentToast(data.msg, 'success');
            this.workSpace.enable();
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
