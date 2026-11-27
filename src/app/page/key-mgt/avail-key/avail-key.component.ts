import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { KeysService } from 'src/app/provider/keys/keys.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-avail-key',
  templateUrl: './avail-key.component.html',
  styleUrls: ['./avail-key.component.scss'],
})
export class AvailKeyComponent  implements OnInit {
  availKey: any = [];
  constructor(
    private httpKey: KeysService,
    private common: CommonService,
    private modalCtrl: ModalController
  ) { }

  ngOnInit() {
    this.getAvailKey();
  }

  getAvailKey() {
    this.common.presentLoading().then(preLoad => {
      this.httpKey.availKey().subscribe({
        next:(data: any) => {
          this.availKey = (data?.data || []).filter((k: any) => String(k.status || '').toLowerCase() === 'available');
        },
        error:() => {
          this.common.dismissloading();
          this.common.presentToast(environment.errMsg, 'danger');
        },
        complete:() => {
          this.common.dismissloading();
        }
      });
    });
  }

  closeModal(data: any, status: any) {
    this.modalCtrl.dismiss(data, status);
  }

}
