import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-cambro-status',
  templateUrl: './cambro-status.component.html',
  styleUrls: ['./cambro-status.component.scss'],
})
export class CambroStatusComponent  implements OnInit {
  indexArr = ['Order Packed', 'Order Dispatched', 'Order Reached at Site', 'Order Received' ];
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
    let order_status;
    if (!this.data.order_status) {
      order_status = 'Order Reached at Site'
    } else {
      order_status = this.data.order_status;
    }
    let index = this.indexArr.indexOf(order_status);
    console.log(index);
    if (index != -1) {
      for (var i = 0 ; i < this.ticketTransaction.length; i++) {
        if (i <= index) {
          this.ticketTransaction[i].class = 'active';
        } else {
          this.ticketTransaction[i].class = 'in-active';
        }
      }
      console.log(this.ticketTransaction);
    }

  }

  close(data: any, status: any) {
    this.modalCtrl.dismiss(data, status);
  }
}
