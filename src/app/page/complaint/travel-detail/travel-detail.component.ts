import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-travel-detail',
  templateUrl: './travel-detail.component.html',
  styleUrls: ['./travel-detail.component.scss'],
})
export class TravelDetailComponent  implements OnInit {
  travelMode: any = [{
    id:1,
    label: 'Bike'
  },{
    id:2,
    label: 'Car'
  },{
    id:3,
    label: 'Other'
  }]
  constructor(
    private modalCtrl: ModalController
  ) { }

  ngOnInit() {}

  closeModal(data: any, status: any) {
    this.modalCtrl.dismiss(data, status);
  }

  openCamera() {

  }

}
