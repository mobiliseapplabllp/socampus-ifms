import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { ConciergeService } from 'src/app/provider/concierge/concierge.service';
import { SiteComponent } from './site/site.component';
import { ConcHistoryComponent } from './conc-history/conc-history.component';
import { Router } from '@angular/router';
import { CommonService } from 'src/app/provider/common/common.service';
import { environment } from 'src/environments/environment';
import { AssignUserComponent } from './assign-user/assign-user.component';

@Component({
  selector: 'app-concierge',
  templateUrl: './concierge.page.html',
  styleUrls: ['./concierge.page.scss'],
})
export class ConciergePage implements OnInit {
  status = 'assignto';
  dashboard: any = {};
  ticketData: any = [];
  constructor(
    private httpConcierge: ConciergeService,
    private modalCtrl: ModalController,
    private router: Router,
    private common: CommonService
  ) { }

  ngOnInit() {

  }

  ionViewDidEnter() {
    this.getTicketList();
  }

  getTicketList(ticketType?: string) {
    const obj = {
      page: 1,
      limit: 10,
      export: 0,
      search: "",
      ticketType: ticketType ? ticketType : 'assignto'
    }
    this.common.presentLoading().then(preLoad => {
      this.httpConcierge.getTicketList(obj).subscribe({
        next:(data: any) => {
          if (data.status) {
            this.dashboard = data.tcktCount;
            this.ticketData = data.data.data
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

  async openSite(data: any) {
    const modal = await this.modalCtrl.create({
      component: SiteComponent,
      cssClass: 'my-modal',
      componentProps: {
        requestedData: data
      }
    });
    modal.present();
  }

  async openHistory(data: any) {
    const modal = await this.modalCtrl.create({
      component: ConcHistoryComponent,
      mode: 'md',
      cssClass: 'my-modal-btm',
      initialBreakpoint: 1,
      breakpoints: [1],
      componentProps: {
        id: data.id,
        tab: this.status
      }
    });
    modal.present();
  }

  async assignUser(data: any) {
    const modal = await this.modalCtrl.create({
      component: AssignUserComponent,
      mode: 'md',
      cssClass: 'my-modal-btm',
      initialBreakpoint: 1,
      breakpoints: [1],
      componentProps: {
        id: data.id,
        tab: this.status
      }
    });

    modal.onWillDismiss().then(async disModal => {
      if (disModal.role) {
        this.getTicketList(this.status);
      }
    });
    modal.present();
  }

  workNow(data: any) {
    // this.router.navigateByUrl('/concierge/conc-work');
    this.router.navigate(['/concierge/conc-work'], {
      queryParams: {
        data: JSON.stringify(data),
        tab: this.status
      }
    });
  }

  changeSegment(event: any) {
    this.dashboard = {};
    this.ticketData = [];
    this.status = event.detail.value;
    this.getTicketList(this.status);
  }

  createTicket() {
    this.router.navigateByUrl('/concierge/cr-ticket');
  }


}
