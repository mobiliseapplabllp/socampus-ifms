import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { MyAssetGetService } from 'src/app/provider/my-asset-get/my-asset-get.service';
@Component({
  selector: 'app-asset-plant',
  templateUrl: './asset-plant.component.html',
  styleUrls: ['./asset-plant.component.scss'],
})
export class AssetPlantComponent  implements OnInit {
  plantName: any = [];
  plantNameCopy: any = [];
  loading: any;
  timeout = null;
  faciity_type: any;
  constructor(
    private modalCtrl: ModalController,
    private httpAsset: MyAssetGetService,
    private common: CommonService
  ) { }

  ngOnInit() {
    this.getValueFromPlant();
  }

  closeModal(val: any, status: any) {
    this.modalCtrl.dismiss(val, status);
  }

  ionViewDidLeave() {
    this.plantName = [];
    this.plantNameCopy = [];
    this.common.dismissloading();
  }

  getValueFromPlant() {
    this.common.presentLoading().then(preload => {
      this.httpAsset.getPlantByCategory(this.faciity_type).subscribe(data => {
        this.common.dismissloading();
        if (data.status) {
          this.plantName = data.data;
          this.plantNameCopy = data.data
        }
      })
    });
  }


  search(ev: any) {
    this.plantName = this.plantNameCopy;
    if (ev.target.value != '') {
      this.plantName = this.plantName.filter((data: any) => {
        if ((data.pc_desc.toLowerCase().indexOf(ev.target.value.toLowerCase()) > -1)) {
          return (data.pc_desc.toLowerCase().indexOf(ev.target.value.toLowerCase()) > -1);
        }
        return
      });
    }
  }
}
