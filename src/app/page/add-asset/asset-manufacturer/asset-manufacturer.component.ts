import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { MyAssetGetService } from 'src/app/provider/my-asset-get/my-asset-get.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-asset-manufacturer',
  templateUrl: './asset-manufacturer.component.html',
  styleUrls: ['./asset-manufacturer.component.scss'],
})
export class AssetManufacturerComponent  implements OnInit {
  manufacturer: any = [];
  manufacturerCopy: any = [];
  loading: any;
  constructor(
    private modalCtrl: ModalController,
    private httpAsset: MyAssetGetService,
    private common: CommonService) { }

  ngOnInit() {
    this.getManufacturer();
  }

  ionViewDidLeave() {
    this.manufacturer = [];
    this.manufacturerCopy = [];
    this.common.dismissloading();
  }

  closeModal(val: any, status: any) {
    this.modalCtrl.dismiss(val, status);
  }

  getManufacturer() {
    this.common.presentLoading().then(preLod => {
      this.httpAsset.getManufacturer().subscribe({
        next:(data) => {
          if (data.status) {
            this.manufacturer = data.data;
            this.manufacturerCopy = data.data;
          } else {
            this.common.presentToast(data.msg, 'warning');
          }
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

  search(ev: any) {
    let val: any;
    val = ev.target.value;
    this.manufacturer = this.manufacturerCopy;
    if (val && val.trim() !== '') {
      this.manufacturer = this.manufacturer.filter((dat: any) => {
        if ((dat.mnfctrer_desc.toLowerCase().indexOf(val.toLowerCase()) > -1)) {
          return (dat.mnfctrer_desc.toLowerCase().indexOf(val.toLowerCase()) > -1);
        }
        return
      });
    }
  }

}
