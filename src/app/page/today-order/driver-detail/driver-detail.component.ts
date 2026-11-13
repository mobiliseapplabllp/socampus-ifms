import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { TodayOrderService } from 'src/app/provider/today-order/today-order.service';

@Component({
  selector: 'app-driver-detail',
  templateUrl: './driver-detail.component.html',
  styleUrls: ['./driver-detail.component.scss'],
})
export class DriverDetailComponent  implements OnInit {
  requestedData: any = {};
  myurl!: string;
  totalTime!: string;
  constructor(
    private modalCtrl: ModalController,
    private httpTo: TodayOrderService,
    private common: CommonService
  ) { }

  ngOnInit() {
    console.log(this.requestedData);
  }

  closeModal(data: any, status: any) {
    this.modalCtrl.dismiss(data, status);
  }

  getEncodedUrl() {
    const obj = {
      startlat: 28.41067818260773,
      startlng: 77.31740192317405,
      endlat: 28.648365075924293,
      endlng: 77.27551654658481
    }
    this.httpTo.getEncodedUrl(obj).subscribe({
      next:(dat) => {
        if (dat.status == 'REQUEST_DENIED') {
          this.common.presentToastWithOk(dat.error_message, 'warning');
        } else {
          this.totalTime = dat.routes[0].legs[0].duration.text;
          const legs = dat.routes[0].legs;
          let totalkm = 0, totalm = 0;
          for (var i = 0 ; i < legs.length; i++) {
            if (legs[i].distance.text.includes('km')) {
              totalkm = totalkm + parseFloat(legs[i].distance.text);
            } else {
              totalm = totalm + parseFloat(legs[i].distance.text);
            }

          }
          var addkm: any
          addkm = (((totalkm * 1000) + totalm) / 1000)
          this.myurl = 'https://maps.googleapis.com/maps/api/staticmap?size=600x400&path=enc:' + dat.routes[0].overview_polyline.points + '&key=AIzaSyB7YzAgPdBSGOgSij5inIDNofGfnTu3x9M'
        }
      },
      error:() => {

      },
      complete:() => {

      }
    })
  }

}
