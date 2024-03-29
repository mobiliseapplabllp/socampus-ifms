import { Component, OnInit } from '@angular/core';
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
  menuNew: any = [];
  loading: any;
  result: any = [];
  myMenu: any = [];
  menuTemp: any = [];
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
  constructor(
    private common: CommonService,
    private router: Router,
    private loadingController: LoadingController,
    private httpList: ListMasterService
  ) { }

  ngOnInit() {
    this.common.checkInternet().then(res => {
      if (res) {
        this.getMenuDetail();
      } else {
        let menu_list = JSON.parse(localStorage.getItem('home_menu')!);
        this.chunkedArray(menu_list);
      }
    });
  }

  getMenuDetail() {
    this.presentLoading().then(preLoad => {
      this.httpList.getMenuDetail().then(data => {
        this.dismissloading();
        this.result = data;
        if (this.result.status == true) {
          this.myMenu = this.result.data[0].submenu;
          this.chunkedArray(this.result.data[0].submenu)
          localStorage.setItem('home_menu', JSON.stringify(this.myMenu));
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
    console.log(this.menuNew);
  }


  openPage(data: any) {
    this.common.checkInternet().then(res => {
      if (res) {
        if (data.link == 'not') {
          this.common.presentToast('Not activated yet', 'warning' );
          return;
        }
        this.router.navigateByUrl(data.link);
        return;
      } else {
        console.log(data);
        if (data.smnu_id == 403) {
          this.router.navigateByUrl('/digital-checklist');
        } else {
          this.common.presentToast(data.smnu_desc + ' Not Working on Offline Mode.', 'warning')
        }
      }
    })
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



}
