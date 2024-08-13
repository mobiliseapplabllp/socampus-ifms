import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-sos',
  templateUrl: './sos.component.html',
  styleUrls: ['./sos.component.scss'],
})
export class SosComponent  implements OnInit {
  defaultTime = 20;
  timeout = 20;
  clrinterval: any;
  constructor(
    private modalCtrl: ModalController
  ) { }

  ngOnInit() {
    this.timeout = this.defaultTime;
    this.clrinterval = setInterval(() => {
      this.timeout--;
      if(this.timeout < 1) {
        this.hitRequest();
        clearInterval(this.clrinterval);
      }
    }, 1000);
  }

  hitRequest() {

  }

  closeModal(data: any, status: any) {
    this.defaultTime = 20;
    clearInterval(this.clrinterval);
    this.modalCtrl.dismiss(data, status);
  }
}
