import { Component, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-photo-view',
  templateUrl: './photo-view.component.html',
  styleUrls: ['./photo-view.component.scss'],
})
export class PhotoViewComponent implements OnInit, OnDestroy {
  blobFile!: Blob;
  imageUrl!: any;
  private objectUrl: string | null = null;

  constructor(
    private sanitizer: DomSanitizer,
    private modalCtrl: ModalController
  ) { }

  ngOnInit() {
    this.objectUrl = URL.createObjectURL(this.blobFile);
    this.imageUrl = this.sanitizer.bypassSecurityTrustUrl(this.objectUrl);
  }

  ngOnDestroy() {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
    }
  }

  closeModal(data: any, status: any) {
    this.modalCtrl.dismiss(data, status);
  }

}
