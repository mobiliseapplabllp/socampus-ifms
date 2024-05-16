import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-cambro-status',
  templateUrl: './cambro-status.component.html',
  styleUrls: ['./cambro-status.component.scss'],
})
export class CambroStatusComponent  implements OnInit {
  indexArr = [{
    label: 'Order Packed',
    id: 0
  }, {
    label: 'Order Dispatched',
    id: 1
  }, {

  }, ''];
  data: any;
  ticketTransaction: any = [{
    status: 'Order Packed',
    time: '12:30',
    class: 'in-active'
  }, {
    status: 'Order Dispatched',
    time: '15:00',
    class: 'in-active'
  }, {
    status: 'Order Reached at Site',
    time: '18:00',
    class: 'in-active'
  }, {
    status: 'Order Received',
    time: '19:00',
    class: 'in-active'
  }];
  constructor(
    private modalCtrl: ModalController
  ) { }

  ngOnInit() {
    console.log(this.data);
    let order_status = 'Order Reached at Site';

  }

  close(data: any, status: any) {
    this.modalCtrl.dismiss(data, status);
  }

}
