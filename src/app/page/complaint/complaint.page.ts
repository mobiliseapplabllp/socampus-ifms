import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController, ModalController } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { ComplaintService } from 'src/app/provider/complaint/complaint.service';
import { environment } from 'src/environments/environment';
import { CostCenterComponent } from '../../shared/cost-center/cost-center.component';
import { CaptureComponent } from 'src/app/shared/capture/capture.component';
@Component({
  selector: 'app-complaint',
  templateUrl: './complaint.page.html',
  styleUrls: ['./complaint.page.scss'],
})
export class ComplaintPage implements OnInit {
  @ViewChild('videoElement') videoElement!: ElementRef;
  @ViewChild('video') video!: ElementRef;

  mediaRecorder: any;
  recordedChunks: Blob[] = [];
  output: any;

  status = 'not_resolved';
  tickets: any = [];
  ticketsCopy: any = [];
  ticketStages: any = [];
  page = 1;
  isHideInfinite!: boolean;
  ticketStatus = null;
  loading: any;
  timeout = null;
  myTicket: any = [];
  myTicketCopy: any = [];
  latitude: any;
  longitude: any;
  myticketPage = 1;
  searchBy: any;
  searchValue!: string;
  searchValueDesc!: string;
  resolveTicket: any = [];
  isWorkingVid = false;
  constructor(
    private httpCompalint: ComplaintService,
    private httpCommon: CommonService,
    private router: Router,
    private loadingController: LoadingController,
    private modalController: ModalController
  ) { }

  ngOnInit() {
  }

  ngAfterViewInit(): void {}

  ionViewDidEnter() {}

  ionViewDidLeave() {}

  async openCapture() {
    const modal = await this.modalController.create({
      component: CaptureComponent,
      componentProps : { }
    });
    modal.onWillDismiss().then(disModal => {
      console.log(disModal);
      if (disModal.role) {
      }
    });
    return await modal.present();
  }

  startRecording() {
    const videoElement: HTMLVideoElement = this.videoElement.nativeElement;
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
      videoElement.srcObject = stream;
      this.mediaRecorder = new MediaRecorder(stream);
      this.mediaRecorder.ondataavailable = (event: any) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };
      this.mediaRecorder.start();
    }).catch((err) => {
      console.error('Error accessing media devices: ', err);
    });
  }

  stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      setTimeout(() => {
        const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
        console.log(blob);
        this.output = blob;
        const stream = this.videoElement.nativeElement.srcObject as MediaStream;
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
        this.videoElement.nativeElement.srcObject = null;
        this.playRecordedVideo();
      }, 1000);

    }
  }

  downloadVideo() {
    const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
    console.log(blob);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    document.body.appendChild(a);
    a.style.display = 'none';
    a.href = url;
    a.download = 'recorded-video.webm';
    a.click();
    window.URL.revokeObjectURL(url);
  }


  playRecordedVideo() {
    if (this.output) {
      const url = window.URL.createObjectURL(this.output);
      this.video.nativeElement.src = url;
      this.video.nativeElement.play();
      // Revoke object URL when video playback is done
      this.video.nativeElement.onended = () => {
        window.URL.revokeObjectURL(url);
      };
    }
  }


  ionViewWillEnter() {
    this.getTicketStages();
    this.page = 1;
    this.tickets = [];
    this.ticketsCopy = [];
    this.getTicketMaster(this.ticketStatus, this.page);
  }

  getTicketStages() {
    this.httpCompalint.getAllTicketStages().subscribe(data => {
      if (data.status) {
        this.ticketStages = data.data;
      }
    });
  }

  changeTickeType(ev:  any) {
    this.page = 1;
    this.tickets = [];
    this.getTicketMaster(ev.target.value , this.page);
  }

  getTicketMaster(status: any, page: any) {
    this.presentLoading().then(preLoad => {
      this.httpCompalint.getTicketMaster(status, page).subscribe({
        next:(data) => {
          if (data.status) {
            this.page = this.page + 1;
            this.tickets = data.data.data;
            this.ticketsCopy = data.data.data;
            this.ticketStatus = status;
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
    });
  }

  openTicketPage(data: any, ticket_type: any) {
    this.router.navigate(['/complaint/ticket-work'], {
      queryParams: {
        data: JSON.stringify(data),
        tkttype: ticket_type
      }
    });
  }

  searchTicketFromServer() {
    if (this.searchBy == 'all') {
      this.getTicketMaster(null, 1);
      return;
    }
    this.presentLoading().then(preLoad => {
      this.httpCompalint.searchTicketFromServer(this.searchBy, this.searchValue).subscribe(data => {
        this.dismissloading();
        if (data.status) {
          this.page = this.page + 1;
          this.tickets = data.data.data;
          this.ticketsCopy = data.data.data;
        } else {
          this.tickets = [];
          this.ticketsCopy = [];
          this.httpCommon.presentToast(data.msg, 'warning');
        }
      })
    });
  }

  changeSearch() {
    this.searchValue = '';
  }

  loadData(event: any) {
    this.httpCompalint.getTicketMaster(this.ticketStatus, this.page).subscribe(data => {
      event.target.complete();
      if (data.status) {
        let length, ticket_arr;
        ticket_arr = data.data.data;
        length = ticket_arr.length;
        for (var i = 0 ; i < length; i++) {
          this.tickets.push(ticket_arr[i]);
        }
        this.page = this.page + 1;
      } else {}
    });
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
  changeSegment(ev: any) {
    if (ev.target.value == 'resolved') {
      this.presentLoading().then(preLoad => {
        this.resolveTicket = [];
        this.httpCompalint.getResolvedTicket().subscribe({
          next:(data) => {
            if (data.status) {
              this.resolveTicket = data.data.data;
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
        });
      });
    }
  }

  loadData1(event: any) {
    this.httpCompalint.getMyTicket(this.myticketPage).subscribe({
      next:(data) => {
        if (data.status) {
          let length, ticket_arr;
          ticket_arr = data.data.data;
          length = ticket_arr.length;
          for (var i = 0 ; i < length; i++) {
            this.myTicket.push(ticket_arr[i]);
          }
          this.myticketPage = this.myticketPage + 1;
        } else {
          this.httpCommon.presentToast(data.msg, 'warning');
        }
      },
      error:() => {

      },
      complete:() => {

      }
    });
  }

  changeMyTickt(ev: any) {
    this.myTicket = this.myTicketCopy;
    if (ev.target.value && ev.target.value.trim() !== '') {
      this.myTicket = this.myTicket.filter((dat: any) => {
        if ((dat.tkts_id.toString().toLowerCase().indexOf(ev.target.value.toLowerCase()) > -1)) {
          return (dat.tkts_id.toString().toLowerCase().indexOf(ev.target.value.toLowerCase()) > -1);
        } else if ((dat.subcat1_desc.toLowerCase().indexOf(ev.target.value.toLowerCase()) > -1)) {
          return (dat.subcat1_desc.toLowerCase().indexOf(ev.target.value.toLowerCase()) > -1);
        } else if ((dat.pc_desc.toLowerCase().indexOf(ev.target.value.toLowerCase()) > -1)) {
          return (dat.pc_desc.toLowerCase().indexOf(ev.target.value.toLowerCase()) > -1);
        }
        return
      });
    }
  }

  searchItem(ev: any) {
    this.tickets = this.ticketsCopy;
    if (ev.target.value && ev.target.value.trim() !== '') {
      this.tickets = this.tickets.filter((dat: any) => {
        if ((dat.tkts_id.toString().toLowerCase().indexOf(ev.target.value.toLowerCase()) > -1)) {
          return (dat.tkts_id.toString().toLowerCase().indexOf(ev.target.value.toLowerCase()) > -1);
        } else if ((dat.subcat1_desc.toLowerCase().indexOf(ev.target.value.toLowerCase()) > -1)) {
          return (dat.subcat1_desc.toLowerCase().indexOf(ev.target.value.toLowerCase()) > -1);
        } else if ((dat.pc_desc.toLowerCase().indexOf(ev.target.value.toLowerCase()) > -1)) {
          return (dat.pc_desc.toLowerCase().indexOf(ev.target.value.toLowerCase()) > -1);
        }
        return
      });
    }
  }

  creteTicket() {
    this.router.navigateByUrl('/complaint/create-ticket');
  }

  async openRoName() {
    const modal = await this.modalController.create({
      component: CostCenterComponent,
      cssClass: 'my-modal',
      componentProps : { }
    });
    modal.onWillDismiss().then(disModal => {
      if (disModal.role) {
        this.searchValueDesc = disModal.data.label;
        this.searchValue = disModal.data.value;
      }
    });
    return await modal.present();
  }

  myCustom(ev: any) {
    this.page = 1;
    this.tickets = [];
    this.ticketsCopy = [];
    this.getTicketMaster(this.ticketStatus, this.page);
  }

}
