import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { LoadingController, ModalController } from '@ionic/angular';
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
  SPLIT_VIDEO_TIME = 180
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
      this.formData.append('remark', 'CUSTOM VIDEO UPLOAD');
      this.formData.append('source', environment.source);
      this.formData.append('ticketId', this.requestedData.tkts_id);
      this.formData.append('ptwApproved', this.requestedData.ptwApproved);
      this.formData.append('ptwPending', this.requestedData.ptwPending);
      this.formData.append('ptw_mandatory', this.requestedData.ptw_mandatory);
      this.formData.append('ppekitFilled', this.requestedData.ppekitFilled)
      this.formData.append('ppekit_mandatory', this.requestedData.ppekit_mandatory)
      this.openCamera();
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
        videoBitsPerSecond: 200000,         // Set video bitrate to 500kbps
        audioBitsPerSecond: 64000           // Set audio bitrate to 64kbps
      };
      this.mediaRecorder = new MediaRecorder(stream, options);
        this.stream = stream;
        this.mediaRecorder.ondataavailable = (event: any) => {
          if (event.data.size > 0) {
            console.log(event.data);
            this.formData.delete('video');
            this.saveBlobAsFile(event.data, `video_chunk_${Date.now()}.webm`);
          }
        };
      }).catch((err) => {
        console.error('Error accessing media devices:', err);
    });
  }

  playVideo() {
    setTimeout(() => {
      this.isCameraOpen = false;
    }, 2000);
    this.stopStream();
  }

  playRecordedVideo() {
    if (this.output) {
      const url = window.URL.createObjectURL(this.output);
      this.video.nativeElement.src = url;
      this.video.nativeElement.play();
      this.video.nativeElement.onended = () => {
        window.URL.revokeObjectURL(url);
      };
    }
  }


  startRecording() {
    this.mediaRecorder.start();
    this.isRecordingStart = true;
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
  }


// saveBlobAndRestart() {
//   let setTimeOut = setTimeout(() => {
//     this.mediaRecorder.stop();
//     this.startRecording();
//   }, 30 * 1000);
// }

saveBlobAsFile(blob: any, fileName: any) {
  console.log(blob);
  // const b = new Blob(blob, { type: 'video/webm' });
  this.formData.append('video', blob, fileName);
  this.output = blob;

  this.uploadToServer(this.formData);
  return;
  // return;
  // this.recordedVideo.push(blob);
  // console.log(this.recordedVideo);
  // return;
  // // console.log(blob);
  // // console.log(fileName);
  // const tempArr = []
  // tempArr.push(blob);
  // this.output = new Blob(tempArr, { type: 'video/webm' });
  // // console.log(concatenatedBlob);
  // this.recordedVideo.push(this.output);
  // this.presentLoading().then(preLoad => {
  //   this.dismissloading();
  // })

  // console.log(this.recordedVideo);
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
  this.httpComplaint.submitTicketTransaction(formData).subscribe({
    next:(data) => {
      if (data.status) {
        this.splitCount = this.splitCount + 1;
      } else {
        this.common.presentToast(data.msg, 'warning');
      }
    },
    error:() => {
      this.common.presentToast(environment.errMsg, 'danger');
    },
    complete:() => {
    }
  });
}


  // ngOnInit() {
  //   this.liveVideo = document.getElementById('liveVideo');
  //   setTimeout(() => {
  //     this.openCamera();
  //   }, 1000);
  // }

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
      message: 'Please wait...'
    });
    await this.loading.present();
  }

  async dismissloading() {
    if (this.loading) {
      this.loading.dismiss();
    }
  }

}
