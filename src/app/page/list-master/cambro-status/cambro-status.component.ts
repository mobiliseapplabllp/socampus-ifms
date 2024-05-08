import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-cambro-status',
  templateUrl: './cambro-status.component.html',
  styleUrls: ['./cambro-status.component.scss'],
})
export class CambroStatusComponent  implements OnInit {
  data: any
  constructor(
    private modalCtrl: ModalController
  ) { }

  ngOnInit() {
    console.log(this.data);
  }

  close(data: any, status: any) {
    this.modalCtrl.dismiss(data, status);
  }

}
