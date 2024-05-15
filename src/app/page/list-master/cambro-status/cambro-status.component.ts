import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-cambro-status',
  templateUrl: './cambro-status.component.html',
  styleUrls: ['./cambro-status.component.scss'],
})
export class CambroStatusComponent  implements OnInit {
  data: any;
  ticketTransaction: any = [{status: 'Packed', time: '12:30', class: 'active'}, {status: 'Dispatched', time: '15:00', class: 'active'}, { status: 'Reach at Site', time: '18:00', class: 'active'}, { status: 'Return Initiated', time: '19:00', class: 'active'}, { status: 'Driver Picked', time: '21:00', class: 'in-active'}, { status: 'Received CPU', time: '23:00', class: 'in-active'}]
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
