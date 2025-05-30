import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { MyAssetGetService } from 'src/app/provider/my-asset-get/my-asset-get.service';

@Component({
  selector: 'app-asset-devicename',
  templateUrl: './asset-devicename.component.html',
  styleUrls: ['./asset-devicename.component.scss'],
})
export class AssetDevicenameComponent  implements OnInit {
  myDeviceName: any = [];
  myDeviceNameCopy: any = [];
  loading:any;
  grp_id: any;
  constructor(
    private modalCtrl: ModalController,
    private httpAsset: MyAssetGetService,
    private common: CommonService
  ) { }

  ngOnInit() {
    this.getDeviceName();
  }

  ionViewDidLeave() {
    this.myDeviceName = [];
    this.myDeviceNameCopy = [];
    this.common.dismissloading();
  }

  getDeviceName() {
    this.common.presentLoading().then(preLaod => {
      this.httpAsset.getDeviceName(this.grp_id).subscribe({
        next:(data) => {
          if (data.status) {
            this.myDeviceName = data.data;
            this.myDeviceNameCopy = data.data
          }
        },
        error:() => {
          this.common.dismissloading();
        },
        complete:() => {
          this.common.dismissloading();
        }
      });
    });
  }

  closeModal(val: any, status: any) {
    this.modalCtrl.dismiss(val, status);
  }

  search(ev: any) {
    let val: any;
    val = ev.target.value;
    this.myDeviceName = this.myDeviceNameCopy;
    if (val && val.trim() !== '') {
      this.myDeviceName = this.myDeviceName.filter((dat: any) => {
        if ((dat.label.toLowerCase().indexOf(val.toLowerCase()) > -1)) {
          return (dat.label.toLowerCase().indexOf(val.toLowerCase()) > -1);
        }
        return
      });
    }
  }
}
