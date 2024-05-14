import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { LoadingController, ModalController } from '@ionic/angular';

@Component({
  selector: 'app-capture',
  templateUrl: './capture.component.html',
  styleUrls: ['./capture.component.scss'],
})
export class CaptureComponent  implements OnInit {
  mediaRecorder: any;
  recordedChunks: Blob[] = [];
  liveVideo: any;
  stream: any;
  blobImage!: any;
  currentStatus = 'camera-running';
  loading: any;
  constructor(
    private modalCtrl: ModalController,
    private loadingController: LoadingController
  ) { }

  ngOnInit() {
    this.liveVideo = document.getElementById('liveVideo');
    setTimeout(() => {
      this.openCamera();
    }, 1000);
  }

  closeModal(data: any, status: any) {
    this.modalCtrl.dismiss(data, status)
  }

  openCamera() {
    navigator.mediaDevices.getUserMedia({ video: true, audio: false }).then((stream) => {
      this.stream = stream;
      this.liveVideo.srcObject = stream;
      // this.mediaaRecorder = new MediaRecorder(stream);
      // this.mediaRecorder.ondataavailable = (event: any) => {
      //   if (event.data.size > 0) {
      //     this.recordedChunks.push(event.data);
      //   }
      // };
      // this.mediaRecorder.start();
    }).catch((err) => {
      console.error('Error accessing media devices: ', err);
    });
  }

  closeCamera() {
    this.stream.getTracks().forEach((track: any) => track.stop());
    this.liveVideo.srcObject = null;
    this.closeModal(null, false);
  }

  captureImage() {
    console.log(this.liveVideo + '=' +this.liveVideo.width + '=' + this.liveVideo.height);
    const canvas = document.createElement('canvas');
    const ctx: any = canvas.getContext('2d');
    const width = 700;
    const height = 600;
    setTimeout(() => {
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(this.liveVideo, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (blob) {
          this.currentStatus = 'photo-capture';
          setTimeout(() => {
            this.blobImage = URL.createObjectURL(blob);
            const imageElement: HTMLImageElement = document.getElementById('imagePreview') as HTMLImageElement;
            if (imageElement) {
              imageElement.src = this.blobImage;
            }
            this.stream.getTracks().forEach((track: any) => track.stop());
            this.liveVideo.srcObject = null;
          }, 1000);
          this.presentLoading().then(preLoad => {
            this.dismissloading();
          })
        }
      }, 'video/webm');
    }, 1000);
  }

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
