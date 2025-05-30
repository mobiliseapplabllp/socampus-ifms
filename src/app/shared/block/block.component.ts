import { Component, OnInit } from '@angular/core';
import { LoadingController, ModalController } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { MyAssetGetService } from 'src/app/provider/my-asset-get/my-asset-get.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-block',
  templateUrl: './block.component.html',
  styleUrls: ['./block.component.scss'],
})
export class BlockComponent  implements OnInit {
  allData: any;
  loading: any;
  blockArr: any;
  blockArrCopy: any = [];
  constructor(
    private httpAsset: MyAssetGetService,
    private loadingController: LoadingController,
    private common: CommonService,
    private modalCtrl: ModalController
  ) { }

  ngOnInit() {    
    this.getBlock();
  }

  closeModal(data: any, status: any) {
    this.modalCtrl.dismiss(data, status);
  }

  getBlock() {
    this.presentLoading().then(preLoad => {
      this.httpAsset.getBlock(this.allData.pc_id).subscribe({
        next:(data) => {
          if (data.status) {
            this.blockArr = data.data;
            this.blockArrCopy = data.data;
          } else {
            this.common.presentToast(data.msg, 'warning')
          }
        },
        error:() => {
          this.common.presentToast(environment.errMsg, 'danger');
          this.dismissloading();
        },
        complete:() => {
          this.dismissloading();
        }
      });
    })
  }

  search(ev: any) {
    this.blockArr = this.blockArrCopy;
    if (ev.target.value && ev.target.value.trim() !== '') {
      this.blockArr = this.blockArr.filter((dat: any) => {
        if ((dat.label.toString().toLowerCase().indexOf(ev.target.value.toLowerCase()) > -1)) {
          return (dat.label.toString().toLowerCase().indexOf(ev.target.value.toLowerCase()) > -1);
        }
        return
      });
    }
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




}
