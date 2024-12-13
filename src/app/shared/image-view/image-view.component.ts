import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-image-view',
  templateUrl: './image-view.component.html',
  styleUrls: ['./image-view.component.scss'],
})
export class ImageViewComponent implements OnInit {
  base64!: string;
  blob!: any;
  constructor(
    private modalCtrl: ModalController
  ) { }

  ngOnInit() {
    if (!this.base64) {
      const imageUrl = URL.createObjectURL(this.blob);
      const imageElement: any = document.getElementById('myImage');
      if (imageElement) {
        imageElement.src = imageUrl;
      }
    }
  }

  ionViewDidLeave() {
    this.base64 = '';
    this.blob = ''
  }

  close(data: any, status: any) {
    this.modalCtrl.dismiss(data, status);
  }

}
