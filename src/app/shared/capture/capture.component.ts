import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { LoadingController, ModalController } from '@ionic/angular';
import * as moment from 'moment';
import { CommonService } from 'src/app/provider/common/common.service';
import { ComplaintService } from 'src/app/provider/complaint/complaint.service';
import { environment } from 'src/environments/environment';
@Component({
  selector: 'app-capture',
  templateUrl: './capture.component.html',
  styleUrls: ['./capture.component.scss'],
})
export class CaptureComponent  implements OnInit {
  @ViewChild('videoElement') videoElement!: ElementRef;
  @ViewChild('video') video!: ElementRef;
  requestedData: any;
  vidRef: any
  mediaRecorder: any;
  isRecordingStart = false;
  isShowFinal = false;
  stream: any;
  recordingCount = 0;
  splitCount = 0;
  clrInterval: any;
  clrTimeout: any;
  recordedVideo: any = [];
  isCameraOpen = true;
  output: any;
  loading: any;
  formData = new FormData();
  SPLIT_VIDEO_TIME = 100;
  VIDEO_BYTE = 2;
  isProcessing = false;
  dateTime!: string;
  COUNTDOWNTIME = 3;
  PENDING_VIDEO: any = [];
  videoCount = 0;
  constructor(
    private modalCtrl: ModalController,
    private loadingController: LoadingController,
    private httpComplaint: ComplaintService,
    private common: CommonService) { }

  ngOnInit(): void {
    setTimeout(() => {
      this.formData.append('pc_id', this.requestedData.pc_id);
      this.formData.append('status', '3');
      this.formData.append('remark', this.requestedData.remark);
      this.formData.append('source', environment.source);
      this.formData.append('ticketId', this.requestedData.tkts_id);
      this.formData.append('ptwApproved', this.requestedData.ptwApproved);
      this.formData.append('ptwPending', this.requestedData.ptwPending);
      this.formData.append('ptw_mandatory', this.requestedData.ptw_mandatory);
      this.formData.append('ppekitFilled', this.requestedData.ppekitFilled)
      this.formData.append('ppekit_mandatory', this.requestedData.ppekit_mandatory)
      this.openCamera();
     }, 1000);
     this.clrInterval = setInterval(() => {
      this.COUNTDOWNTIME = this.COUNTDOWNTIME - 1;
      if (this.COUNTDOWNTIME < 1) {
        clearInterval(this.clrInterval);
        this.clrInterval = null;
      }
     }, 1000);
  }

  openCamera() {
    this.vidRef = HTMLVideoElement = this.videoElement.nativeElement;
    navigator.mediaDevices.getUserMedia({
      video: {
        width: {
          ideal: 640
        },
        height: {
          ideal: 480
        },
        frameRate: {
          ideal: 15
        },
        facingMode: {
          ideal: 'environment'
        }
      },
      audio: true
    }).then((stream) => {
      this.vidRef.srcObject = stream;
      this.vidRef.muted= true;
      const options = {
        mimeType: 'video/webm; codecs=vp8', // Ensure compatibility
        videoBitsPerSecond: 500000,         // Set video bitrate to 500kbps
        audioBitsPerSecond: 64000           // Set audio bitrate to 64kbps
      };
      this.mediaRecorder = new MediaRecorder(stream, options);
        this.stream = stream;
        this.mediaRecorder.ondataavailable = (event: any) => {
          if (event.data.size > 0) {
            let fullDateTime = this.dateTime + moment().format('H:mm:ss)');
            fullDateTime = fullDateTime.replace(/([A-Z][a-z]{2})/, (match) => match.toUpperCase());
            this.videoCount = this.videoCount + 1;
            this.PENDING_VIDEO.push({
              id: this.videoCount,
              video: event.data,
              name: fullDateTime + '.webm'
            });
            if (this.PENDING_VIDEO.length === 1) {
              this.repeatLoop();
            }
          }
        };
      }).catch((err) => {
        console.error('Error accessing media devices:', err);
    });
  }

  repeatLoop() {
    if (this.PENDING_VIDEO.length > 0) {
      this.formData.delete('video');
      this.formData.append('video', this.PENDING_VIDEO[0].video, this.PENDING_VIDEO[0].name);
      this.uploadToServer(this.formData)
    }
  }

  startRecording() {
    this.mediaRecorder.start();
    this.isRecordingStart = true;
    this.dateTime = moment().format('DMMMY(H:mm:ss-');
    if (!this.clrInterval) {
      this.clrInterval = setInterval(() => {
        this.recordingCount++;
      }, 1000);
    }
    this.clrTimeout = setTimeout(() => {
      this.stopAndRestart();
    }, this.SPLIT_VIDEO_TIME * 1000);
  }

  stopStream() {
    this.stream.getTracks().forEach((track: any) => track.stop());
    this.vidRef.srcObject = null;
  }

  stopAndRestart() {
    this.mediaRecorder.stop();
    setTimeout(() => {
      this.startRecording();
    }, 500);
  }

  stopRecording() {
    this.mediaRecorder.stop();
    this.isRecordingStart = false;
    this.recordingCount = 0;
    clearInterval(this.clrInterval);
    clearTimeout(this.clrTimeout);
    this.clrInterval = null;
    this.presentLoading().then(preLoad => {
      this.dismissloading();
    })
  }

  saveBlobAsFile(blob: any, fileName: any) {
    this.formData.append('video', blob, fileName);
    this.uploadToServer(this.formData);
  }

  uploadToServer(formData: any) {
    this.isProcessing = true;
    this.httpComplaint.submitTicketTransaction(formData).subscribe({
      next:(data) => {
        if (data.status) {
          this.splitCount = this.splitCount + 1;
          this.PENDING_VIDEO.splice(0,1);
          if (!this.isRecordingStart && this.PENDING_VIDEO.length == 0) {
            this.isShowFinal = true;
          } else {
            setTimeout(() => {
              this.repeatLoop();
            }, 2000);
          }
        } else {
          this.common.presentToast(data.msg, 'warning');
        }
      },
      error:() => {
        this.isProcessing = false;
        this.common.presentToast(environment.errMsg, 'danger');
        this.presentLoading().then(preLoad => {
          this.dismissloading();
        });
      },
      complete:() => {
        this.isProcessing = false;
        this.presentLoading().then(preLoad => {
          this.dismissloading();
        });
      }
    });
  }

  finalUpload() {
    this.common.presentToast('Video Uploaded to Server Successfully', 'warning');
    this.closeModal([], true);
  }

  closeModal(data: any, status: any) {
    if (this.isRecordingStart) {
      this.stopRecording();
    }
    this.stopStream();
    this.modalCtrl.dismiss(data, status)
  }

  async presentLoading() {
    this.loading = await this.loadingController.create({
      cssClass: 'my-custom-class',
      message: 'Please wait...',
      duration: 3000
    });
    await this.loading.present();
  }

  async dismissloading() {
    if (this.loading) {
      this.loading.dismiss();
    }
  }

}
