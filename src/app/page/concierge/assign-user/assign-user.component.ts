import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { format } from 'path';
import { CommonService } from 'src/app/provider/common/common.service';
import { ConciergeService } from 'src/app/provider/concierge/concierge.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-assign-user',
  templateUrl: './assign-user.component.html',
  styleUrls: ['./assign-user.component.scss'],
})
export class AssignUserComponent  implements OnInit {
  id: any;
  tab: any;
  assign_to: any;
  ext_id: any;
  assignUsers: any = [];
  assignUsersCopy: any = [];
  tckt: any = [];
  isSelect: any;
  userData: any = [];
  constructor(
    private common: CommonService,
    private httpConcierge: ConciergeService,
    private modalCtrl: ModalController
  ) { }

  ngOnInit() {    
    this.userData = JSON.parse(localStorage.getItem('user')!);
    
    this.getSpecificTicket();
  }

  getSpecificTicket() {
    const obj = {
      tab: this.tab,
      tckt: this.id,
    }
    this.common.presentLoading().then(preLoad => {
      this.httpConcierge.getSpecificTicket(obj).subscribe({
        next:(data: any) => {
          if (data.status) {
            this.assignUsers = data.data.assignUsers;
            this.assignUsersCopy = data.data.assignUsers;
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

  close(data: any, status: any) {
    this.modalCtrl.dismiss(data, status);
  }

  assign(dat: any) {    
    const formData = new FormData();
    formData.append('tckt', this.id);
    formData.append('assign_to', dat.id);
    formData.append('source', environment.source);
    this.common.presentLoading().then(preLoad => {
      this.httpConcierge.ticketAssign(formData).subscribe({
        next:(data: any) => {
          if (data.status) {
            this.common.presentToast(data.msg, 'success');
            this.close(null, true);
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
    });
  }

  search(ev: any) {
    const searchTerm = (ev.target.value || '').toLowerCase();
    this.assignUsers = this.assignUsersCopy;
    this.assignUsers = this.assignUsers.filter((dat: any) => {
      return (        
        String(dat?.fname ?? '').toLowerCase().includes(searchTerm)        
      );
    });
  }

}
