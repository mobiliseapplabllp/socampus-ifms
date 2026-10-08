import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-site',
  templateUrl: './site.component.html',
  styleUrls: ['./site.component.scss'],
})
export class SiteComponent  implements OnInit {
  requestedData: any;
  constructor(
    private modalCtrl: ModalController,
  ) { }

  ngOnInit() {    
  }

  close(data: any, status: any) {
    this.modalCtrl.dismiss(data, status);
  }

}
