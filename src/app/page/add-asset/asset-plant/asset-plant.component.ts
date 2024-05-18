import { Component, OnInit } from '@angular/core';
import { LoadingController, ModalController } from '@ionic/angular';
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
    private loadingController: LoadingController,
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
    this.dismissloading();
  }

  getValueFromPlant() {
    this.presentLoading().then(preload => {
      this.httpAsset.getPlantByCategory(this.faciity_type).subscribe(data => {
        this.dismissloading();
        if (data.status) {
          this.plantName = data.data;
          this.plantNameCopy = data.data
        }
      })
    });
  }

  async presentLoading() {
    this.loading = await this.loadingController.create({
      cssClass: 'my-custom-class',
      message: 'Please wait...'
    });
    await this.loading.present();
  }

  async dismissloading() {
    if (this.loading) {
      this.loading.dismiss();
    }
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
