import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-cambro-status',
  templateUrl: './cambro-status.component.html',
  styleUrls: ['./cambro-status.component.scss'],
})
export class CambroStatusComponent  implements OnInit {
  data: any;
  ticketTransaction: any = [];
  constructor(
    private modalCtrl: ModalController
  ) { }

  ngOnInit() {
    console.log(this.data);
    this.ticketTransaction = this.data.statusArr;
    let i = 0;
    this.sliderAnimation(i);
  }

  sliderAnimation(i: any) {
    setTimeout(() => {
      if (i < this.ticketTransaction.length) {
        this.ticketTransaction[i].sideright = true;
        i = i + 1
        this.sliderAnimation(i);
      }
    }, i * 100);
  }

  close(data: any, status: any) {
    this.modalCtrl.dismiss(data, status);
  }
}
