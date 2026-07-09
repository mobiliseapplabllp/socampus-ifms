import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-pdf-view',
  templateUrl: './pdf-view.component.html',
  styleUrls: ['./pdf-view.component.scss'],
})
export class PdfViewComponent  implements OnInit {
  pdfSrc: any
  constructor(
    private modalCtrl: ModalController
  ) { }

  ngOnInit() {}

  closeModal(data: any, status: any) {
    this.modalCtrl.dismiss(data, status);
  }

}
