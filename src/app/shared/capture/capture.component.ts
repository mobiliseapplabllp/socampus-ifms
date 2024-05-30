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
  SPLIT_VIDEO_TIME = 15;
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
    console.log(this.requestedData);
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
      audio: false
    }).then((stream) => {
      this.vidRef.srcObject = stream;
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

            // this.formData.delete('video');
            // this.saveBlobAsFile(event.data, `${fullDateTime}.webm`);
          }
        };
      }).catch((err) => {
        console.error('Error accessing media devices:', err);
    });
  }

  repeatLoop() {
    console.log('repeat loop');
    console.log(this.PENDING_VIDEO);
    console.log(this.isProcessing);
    // if (this.isProcessing) {
    //   return;
    // }
    if (this.PENDING_VIDEO.length > 0) {
      this.formData.delete('video');
      console.log(this.PENDING_VIDEO[0]);
      this.formData.append('video', this.PENDING_VIDEO[0].video, this.PENDING_VIDEO[0].name);
      this.uploadToServer(this.formData)
      // console.log(this.PENDING_VIDEO[0]);
      // setTimeout(() => {
      //   console.log('video pop');
      //   console.log(this.PENDING_VIDEO.pop());
      // }, 4000);
    }
  }

  // playVideo() {
  //   setTimeout(() => {
  //     this.isCameraOpen = false;
  //   }, 2000);
  //   this.stopStream();
  // }

  // playRecordedVideo() {
  //   if (this.output) {
  //     const url = window.URL.createObjectURL(this.output);
  //     this.video.nativeElement.src = url;
  //     this.video.nativeElement.play();
  //     this.video.nativeElement.onended = () => {
  //       window.URL.revokeObjectURL(url);
  //     };
  //   }
  // }

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
    return;
    const a: any = document.createElement('a');
    document.body.appendChild(a);
    a.style = 'display: none';
    const url = window.URL.createObjectURL(blob);
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
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
            }, 500);
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

  // openCamera() {
  //   navigator.mediaDevices.getUserMedia({ video: true, audio: false }).then((stream) => {
  //     this.stream = stream;
  //     this.liveVideo.srcObject = stream;
  //     // this.mediaaRecorder = new MediaRecorder(stream);
  //     // this.mediaRecorder.ondataavailable = (event: any) => {
  //     //   if (event.data.size > 0) {
  //     //     this.recordedChunks.push(event.data);
  //     //   }
  //     // };
  //     // this.mediaRecorder.start();
  //   }).catch((err) => {
  //     console.error('Error accessing media devices: ', err);
  //   });
  // }

  // closeCamera() {
  //   this.stream.getTracks().forEach((track: any) => track.stop());
  //   this.liveVideo.srcObject = null;
  //   this.closeModal(null, false);
  // }

  // captureImage() {
  //   console.log(this.liveVideo + '=' +this.liveVideo.width + '=' + this.liveVideo.height);
  //   const canvas = document.createElement('canvas');
  //   const ctx: any = canvas.getContext('2d');
  //   const width = 700;
  //   const height = 600;
  //   setTimeout(() => {
  //     canvas.width = width;
  //     canvas.height = height;
  //     ctx.drawImage(this.liveVideo, 0, 0, width, height);
  //     canvas.toBlob((blob) => {
  //       if (blob) {
  //         this.currentStatus = 'photo-capture';
  //         setTimeout(() => {
  //           this.blobImage = URL.createObjectURL(blob);
  //           const imageElement: HTMLImageElement = document.getElementById('imagePreview') as HTMLImageElement;
  //           if (imageElement) {
  //             imageElement.src = this.blobImage;
  //           }
  //           this.stream.getTracks().forEach((track: any) => track.stop());
  //           this.liveVideo.srcObject = null;
  //         }, 1000);
  //         this.presentLoading().then(preLoad => {
  //           this.dismissloading();
  //         })
  //       }
  //     }, 'video/webm');
  //   }, 1000);
  // }

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
