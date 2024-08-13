import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { LoadingController, ModalController, NavParams } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { ComplaintService } from 'src/app/provider/complaint/complaint.service';
import { VideoPlayComponent } from 'src/app/shared/video-play/video-play.component';

@Component({
  selector: 'app-ticket-history',
  templateUrl: './ticket-history.component.html',
  styleUrls: ['./ticket-history.component.scss'],
})
export class TicketHistoryComponent  implements OnInit {
  @ViewChild('videoPlayer') videoplayer!: ElementRef;
  loading: any;
  ticket_id: any;
  history: any = []
  constructor(
    public navParam: NavParams,
    private modalCtrl: ModalController,
    private loadingController: LoadingController,
    private complaint: ComplaintService,
    private common: CommonService
  ) { }

  ngOnInit() {
    this.ticket_id = this.navParam.get('ticket_id');
    this.getSpecificTicket();
  }

  closeModal() {
    this.modalCtrl.dismiss();
  }

  getSpecificTicket() {
    this.presentLoading().then(preLoad => {
      this.complaint.getSpecificTicket(this.ticket_id).subscribe(data => {
        this.dismissloading();
        if (data.status) {
          this.history = data.data.trans;
        }
      });
    })
  }

  async presentLoading() {
    this.loading = await this.loadingController.create({
      cssClass: 'my-custom-class',
      message: 'Please wait...'
    });
    await this.loading.present();
  }

  dismissloading() {
    this.loading.dismiss();
  }

  async videoPlay(url: string) {
    const modal = await this.modalCtrl.create({
      component: VideoPlayComponent,
      componentProps: {
        url:url,
      }
    });
    modal.onWillDismiss().then(async disModal => {
      if (disModal.role) {
      }
    });
    modal.present();
  }

  viewDoc(url: any) {
    const urlParts = url.split('?')[0];
    const filename = urlParts.split('.').pop();
    if (filename === 'mp4') {
      this.videoPlay(url);
    } else {
      this.common.openDoc(url);
    }


  }

}
