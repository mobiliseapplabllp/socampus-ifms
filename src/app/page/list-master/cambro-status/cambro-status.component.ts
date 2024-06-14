import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-cambro-status',
  templateUrl: './cambro-status.component.html',
  styleUrls: ['./cambro-status.component.scss'],
})
export class CambroStatusComponent  implements OnInit {
  // indexArr = ['Order Packed', 'Order Dispatched', 'Order Reached at Site', 'Order Received' ];
  data: any;
  ticketTransaction: any = [];
  // ticketTransaction: any = [{
  //   status: 'Order Packed',
  //   time: '12:30',
  //   class: 'in-active'
  // }, {
  //   status: 'Order Dispatched',
  //   time: '15:00',
  //   class: 'in-active'
  // }, {
  //   status: 'Order Reached at Site',
  //   time: '18:00',
  //   class: 'in-active'
  // }, {
  //   status: 'Order Received',
  //   time: '19:00',
  //   class: 'in-active'
  // }];
  constructor(
    private modalCtrl: ModalController
  ) { }

  ngOnInit() {
    console.log(this.data);
    this.ticketTransaction = this.data.statusArr;
  }

  close(data: any, status: any) {
    this.modalCtrl.dismiss(data, status);
  }
}
