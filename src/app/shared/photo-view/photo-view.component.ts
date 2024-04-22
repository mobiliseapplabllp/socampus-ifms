import { Component, OnInit } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-photo-view',
  templateUrl: './photo-view.component.html',
  styleUrls: ['./photo-view.component.scss'],
})
export class PhotoViewComponent  implements OnInit {
  blobFile!: Blob;
  imageUrl!: any;
  constructor(
    private sanitizer: DomSanitizer,
    private modalCtrl: ModalController
  ) { }

  ngOnInit() {
    console.log(this.blobFile);
    this.imageUrl = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(this.blobFile));
  }

  closeModal(data: any, status: any) {
    this.modalCtrl.dismiss(data, status);
  }

}
