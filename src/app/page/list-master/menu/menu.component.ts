import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { ListMasterService } from 'src/app/provider/list-master/list-master.service';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss'],
})
export class MenuComponent  implements OnInit {
  @Input() didEnter: any;
  loading: any;
  menuTemp: any = [];
  menuNew: any = [];
  result: any = [];
  menuSlide = {
    initialSlide: 0,
    slidesPerView: 3.5,
    autoplay: false,
    spaceBetween: 0,
    breakpoints: {
      320: {
        slidesPerView: 3.2,
      },
      480: {
        slidesPerView: 3.7,
      },
      530: {
        slidesPerView: 3.9,
      },
      640: {
        slidesPerView: 4.1,
      },
      700: {
        slidesPerView: 4.2,
      },
    }
  }
  isQrScanning = false;
  isInternet!: boolean;
  constructor(
    private loadingController: LoadingController,
    private httpList: ListMasterService,
    private router: Router,
    private common: CommonService,
  ) { }

  ngOnInit() {
    this.common.checkInternet().then(res => {
      if (res) {
        this.isInternet = true;
        this.getMenuDetail();
      } else {
        let temp: any = JSON.parse(localStorage.getItem('home_menu')!);
        this.chunkedArray(temp);
      }
    });
  }

  ngOnChanges() {
    if (this.didEnter && this.isQrScanning && this.isInternet) {
      this.isQrScanning = false
      let bar = this.common.getBarcode();
      if (bar) {
        let token, fullurl;
        token = localStorage.getItem('token1');
        fullurl = bar + '?token=' + token;
        this.common.setBarcode('');
        this.common.openDoc(fullurl);
      }
    }
  }

  getMenuDetail() {
    this.presentLoading().then(preLoad => {
      this.httpList.getMenuDetail().then(data => {
        this.dismissloading();
        this.result = data;
        if (this.result.status == true) {
          this.chunkedArray(this.result.data[0].submenu)
          localStorage.setItem('home_menu', JSON.stringify(this.result.data[0].submenu));
        }
      }, err => {
        this.dismissloading();
      });
    });
  }

  chunkedArray(array: any) {
    const perChunk = 2
    const result = array.reduce((resultArray: any, item: any, index: any) => {
      const chunkIndex = Math.floor(index/perChunk)
      if(!resultArray[chunkIndex]) {
        resultArray[chunkIndex] = []
      }
      resultArray[chunkIndex].push(item)
      return resultArray
    }, [])
    this.menuTemp = [...result];
    this.menuNew = [];
    for (var i = 0 ; i < this.menuTemp.length; i++) {
      this.menuNew.push({menu: this.menuTemp[i]});
    }
  }

  async presentLoading() {
    this.loading = await this.loadingController.create({
      cssClass: 'my-custom-class',
      message: 'Please wait...',
    });
    await this.loading.present();
  }

  async dismissloading() {
    if (this.loading) {
      this.loading.dismiss();
    }
  }

  openPage(data: any) {
    if (data.link === 'barcode_history') {
      this.isQrScanning = true;
      this.router.navigateByUrl('/barcode');
      return
    }
    if (data.link == 'not') {
      this.common.presentToast('Not activated yet', 'warning' );
      return;
    }
    this.router.navigateByUrl(data.link);
  }
}
