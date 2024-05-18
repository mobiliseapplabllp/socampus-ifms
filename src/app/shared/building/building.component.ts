import { Component, OnInit } from '@angular/core';
import { LoadingController, ModalController } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { ComplaintService } from 'src/app/provider/complaint/complaint.service';
import { environment } from 'src/environments/environment';
@Component({
  selector: 'app-building',
  templateUrl: './building.component.html',
  styleUrls: ['./building.component.scss'],
})
export class BuildingComponent  implements OnInit {
  buildingArr: any = [];
  buildingArrCopy: any = [];
  loading: any;
  id: any;
  constructor(
    private modalCtrl: ModalController,
    private httpComp: ComplaintService,
    private common: CommonService,
    private loadingController: LoadingController
  ) { }

  ngOnInit() {
    this.getBuilding(this.id);
  }

  ionViewDidLeave() {
    this.buildingArr = [];
    this.buildingArrCopy = [];
    this.dismissloading();
  }

  getBuilding(id: any) {
    this.presentLoading().then(preLoad => {
      this.httpComp.getBuildingList(id).subscribe({
        next:(data: any) => {
          if (data.status) {
            this.buildingArr = data.data;
            this.buildingArrCopy = data.data;
          } else {
            this.common.presentToast(data.msg, 'warning');
          }
        },
        error:() => {
          this.dismissloading();
          this.common.presentToast(environment.errMsg, 'danger');
        },
        complete:() => {
          this.dismissloading();
        }
      })
    })
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

  closeModal(data: any, status: any) {
    this.modalCtrl.dismiss(data, status);
  }

  search(ev: any) {
    this.buildingArr = this.buildingArrCopy;
    if (ev.target.value && ev.target.value.trim() !== '') {
      this.buildingArr = this.buildingArr.filter((dat: any) => {
        if ((dat.label.toString().toLowerCase().indexOf(ev.target.value.toLowerCase()) > -1)) {
          return (dat.label.toString().toLowerCase().indexOf(ev.target.value.toLowerCase()) > -1);
        }
        return
      });
    }
  }

}
