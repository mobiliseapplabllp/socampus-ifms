import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { MyAssetGetService } from 'src/app/provider/my-asset-get/my-asset-get.service';
@Component({
  selector: 'app-asset-department',
  templateUrl: './asset-department.component.html',
  styleUrls: ['./asset-department.component.scss'],
})
export class AssetDepartmentComponent  implements OnInit {
  myDepartment: any = [];
  myDepartmentCopy: any = [];
  loading: any;
  constructor(
    private modalCtrl: ModalController,
    private httpAsset: MyAssetGetService,
    private common: CommonService
  ) { }

  ngOnInit() {
    this.getDepartment();
  }

  ionViewDidLeave() {
    this.myDepartment = [];
    this.myDepartmentCopy = [];
    this.common.dismissloading();
  }

  closeModal(val: any, status: any) {
    this.modalCtrl.dismiss(val, status);
  }

  getDepartment() {
    this.common.presentLoading().then(preLoad => {
      this.httpAsset.getDepartment().subscribe(data => {
        this.common.dismissloading();
        if (data.status) {
          this.myDepartment = data.data;
          this.myDepartmentCopy = data.data;
        }
      });
    });
  }

  search(ev: any) {
    let val: any;
    val = ev.target.value;
    this.myDepartment = this.myDepartmentCopy;
    if (val && val.trim() !== '') {
      this.myDepartment = this.myDepartment.filter((dat: any) => {
        if ((dat.dept_desc.toLowerCase().indexOf(val.toLowerCase()) > -1)) {
          return (dat.dept_desc.toLowerCase().indexOf(val.toLowerCase()) > -1);
        }
        return
      });
    }
  }
}
