import { Component, OnInit } from '@angular/core';
import { LoadingController, ModalController } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { ComplaintService } from 'src/app/provider/complaint/complaint.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-hse-assign',
  templateUrl: './hse-assign.component.html',
  styleUrls: ['./hse-assign.component.scss'],
})
export class HseAssignComponent  implements OnInit {
  assignUser: any = [];
  assignUserCopy: any = [];
  pc_hse_conf: any;
  loading: any;
  allData: any = [];
  isAscending!: boolean;
  val!: string;
  assignTo: any;
  constructor(
    private modal: ModalController,
    private loadingController: LoadingController,
    private httpCommon: CommonService,
    private httpComplaint: ComplaintService
  ) { }

  ngOnInit() {
    this.getAssignMember();
  }


  close(data: any, status: any) {
    if (status && data.gpsData?.can_assign !== 1 && this.pc_hse_conf.gps_allow === 1) {
      this.httpCommon.presentToast('This User Currently Offline', 'warning');
      return;
    }
    this.modal.dismiss(data, status);
  }

  getAssignMember() {
    let with_gps: any;
    if (this.val === 'buddy') {
      with_gps = 0
    } else {
      with_gps = this.pc_hse_conf?.gps_allow
    }
    this.presentLoading().then(preLoad => {
      this.httpComplaint.getTeam(this.allData.pc_id, with_gps).subscribe({
        next:(data) => {
          if (data.status) {
            this.assignUser = data.data;
            this.assignUserCopy = data.data;
            if (this.val === 'buddy') {
              this.assignUser = this.assignUser.filter((val: any) => val.value != this.assignTo);
              this.assignUserCopy = this.assignUserCopy.filter((val: any) => val.value != this.assignTo);
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
    })
  }

  sortArr() {
    if (!this.isAscending) {
      this.assignUser.sort((a: any, b: any) => a.distance - b.distance);
    } else {
      this.assignUser.sort((a: any, b: any) => b.distance - a.distance);
    }
    this.isAscending = !this.isAscending;
  }


  async presentLoading() {
    this.loading = await this.loadingController.create({
      cssClass: 'my-custom-class',
      message: 'Please wait...',
      duration: 8000
    });
    await this.loading.present();
  }

  async dismissloading() {
    if (this.loading) {
      this.loading.dismiss();
    }
  }

  search(ev: any) {
    let val: any;
    val = ev.target.value;
    this.assignUser = this.assignUserCopy;
    if (val && val.trim() !== '') {
      this.assignUser = this.assignUser.filter((dat: any) => {
        if ((dat.label.toLowerCase().indexOf(val.toLowerCase()) > -1)) {
          return (dat.label.toLowerCase().indexOf(val.toLowerCase()) > -1);
        }
        return
      });
    }
  }
}
