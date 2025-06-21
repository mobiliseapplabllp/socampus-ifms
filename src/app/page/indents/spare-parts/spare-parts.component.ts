import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ModalController } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { IndentsService } from 'src/app/provider/indents/indents.service';
import { environment } from 'src/environments/environment';
import { MaterialDetailsComponent } from '../material-details/material-details.component';
import { env } from 'process';

@Component({
  selector: 'app-spare-parts',
  templateUrl: './spare-parts.component.html',
  styleUrls: ['./spare-parts.component.scss'],
})
export class SparePartsComponent  implements OnInit {
  all_data: any;
  req_indent: any;
  isModalOpen = false;  
  indentLogs: any = [];
  constructor(    
    private router: Router,
    private httpIndent: IndentsService,
    private common: CommonService,
    private modalCtrl: ModalController,
    private alertController: AlertController
  ) { }

  ngOnInit() {    
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras?.state?.['data']) {
      this.all_data = navigation.extras.state['data'];      

    } else {
      console.warn('No data found in router state.');    
    }
  }

  ionViewDidEnter() {    
    this.getTktTran(this.all_data?.data?.tkts_id);
  }

  getTktTran(id: any) {
    this.common.presentLoading().then(preLoad => {
      this.httpIndent.getTktTran(id).subscribe({
        next:(data: any) => {
          if (data.status) {
            this.req_indent = data.reqIndent;
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

  crIndent() {
    this.router.navigate(['/indents/cr-indent'], {
      state: {
        data: this.all_data
      }
    });
  }

  edit(dat: any) {    
    this.common.presentLoading().then(preLoad => {
      this.httpIndent.editIndent(dat.rqst_id).subscribe({
        next:(data: any) => {
          console.log(data);
          if (data.status) {
            this.openMaterialDetails(data.data[0]);
          } else {

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

  async openMaterialDetails(data: any) {                  
    const modal = await this.modalCtrl.create({
      component: MaterialDetailsComponent,
      initialBreakpoint: 1,
      breakpoints: [1],    
      mode: 'ios',  
      componentProps: {           
        index: -1,
        mtrl_type: data.mtrl_type,
        arr: data,
        org_id: this.all_data.data.org_id,
      }
    });
    modal.onWillDismiss().then(async disModal => {
      if (disModal.role) {    
        console.log('updated');        
        this.getTktTran(this.all_data?.data?.tkts_id);                      
      }
    });
    modal.present();
  } 

  async presentAlertConfirm(data: any) {
    const alert = await this.alertController.create({
      cssClass: 'my-custom-class',
      header: 'Delete ' + data.rqst_no + '?',
      mode: 'ios',
      inputs: [{
        name: 'remark',
        type:'textarea',
        placeholder: 'Enter Remarks',
      }],
      buttons: [{
        text: 'Cancel',
          handler: (data) => {
          }
        },{
          text: 'Submit',
          handler: (dat) => {
            if(dat.remark){
              const obj = {
                rqst_id: data.rqst_id,
                cancel_remark: dat.remark
              }
              this.deleteIndent(obj);
            } else {
              this.common.presentToast('Please Enter Remarks', 'warning');
            }
          }
        }]
    });
    await alert.present();
  }

  deleteIndent(obj: Object) {
    this.common.presentLoading().then(preLoad => {
      this.httpIndent.cancelIndent(obj).subscribe({
        next:(data: any) => {
          if (data.status) {
            this.common.presentToast(data.msg, 'success');
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

  viewIndent(dat: any) {    
    this.isModalOpen = true;
    this.getIndentLogs(dat.rqst_id);
  }

  getIndentLogs(rqst_id: number) {
    this.common.presentLoading().then(preLoad => {
      this.httpIndent.getIndentLogs(rqst_id).subscribe({
        next:(data: any) => {
          if (data.status) {
            this.indentLogs = data.data.data;
            this.indentLogs.forEach((element: any) => {            
              if (element.changed_fields) {
                const entries = Object.entries(element.changed_fields).map(([key, value]) => ({
                  key: this.formatKey(key),
                  value
                }));                         
                element.changed_fields1 = entries
              }            
            });
          } else {
            this.common.presentToast(data.msg, 'warning');
          }
        },
        error:() => {
          this.common.presentToast(environment.errMsg, 'danger');
          this.common.dismissloading();
        },
        complete:() => {
          this.common.dismissloading();
        }
      });
    })
    
  }

  formatKey(key: string): string {
    return key.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
  }

  onWillDismiss() {
    this.indentLogs = [];
    this.isModalOpen = false
  }

  viewImg(url: string, blobType: string) {
    this.common.openImg(url, blobType);
  }
}
