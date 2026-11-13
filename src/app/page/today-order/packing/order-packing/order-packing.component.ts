import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IonDatetime, IonSlides, LoadingController, ModalController } from '@ionic/angular';
import * as moment from 'moment';
import { CommonService } from 'src/app/provider/common/common.service';
import { ComplaintService } from 'src/app/provider/complaint/complaint.service';
import { TodayOrderService } from 'src/app/provider/today-order/today-order.service';
import { CpuSiteComponent } from 'src/app/shared/cpu-site/cpu-site.component';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-order-packing',
  templateUrl: './order-packing.component.html',
  styleUrls: ['./order-packing.component.scss'],
})
export class OrderPackingComponent  implements OnInit {
  @ViewChild(IonSlides) slides!: IonSlides;
  @ViewChild('popoverDatetime')  popoverDatetime!: IonDatetime;
  public forms!: FormGroup;
  typeArr: any = [];
  orderStatusArr: any = [];
  packingArr: any = [];
  loading: any;
  dateArr: any = [];
  slideBanner = {
    initialSlide: 0,
    slidesPerView: 5,
    autoplay: false,
    breakpoints: {
      320: {
        slidesPerView: 5,
      },
      480: {
        slidesPerView: 6,
      },
      530: {
        slidesPerView: 7,
      },
      640: {
        slidesPerView: 8,
      },
      700: {
        slidesPerView: 9,
      },
    }
  };
  isApiHit!: boolean;
  isChooserOpen = false;   // entry pe packing-mode chooser modal
  packMode = '';           // '' | 'order' — yaad rakhne ke liye (re-entry pe dobara modal na aaye)
  constructor(
    private modalController: ModalController,
    private formbuilder: FormBuilder,
    private httpComplaint: ComplaintService,
    private common: CommonService,
    private httpTo: TodayOrderService,
    private loadingController: LoadingController,
    private router: Router

  ) { }

  ngOnInit() {
    this.initForms();
    // this.getMealType();
    // this.getOrderStatus();
    let start: any, end: any;
    end = moment().endOf('month').format('DD');
    let status, index = 0;
    for (let i = 1; i <= end ; i++) {
      if (moment().format('YYYY-MM-DD') ==  moment().startOf('month').add(i - 1, 'day').format('YYYY-MM-DD')) {
        status = true;
        index = i;
      } else {
        status = false
      }
      this.dateArr.push({
        date: moment().startOf('month').add(i - 1, 'day').format('DD'),
        day: moment().startOf('month').add(i - 1, 'day').format('dddd')[0],
        isSelect: status,
        ind: i,
        fulldate : moment().startOf('month').add(i - 1, 'day').format('YYYY-MM-DD')
      })
    }
    setTimeout(() => {
      this.slides.slideTo(index - 3);
    }, 50);
  }

  initForms() {
    this.forms = this.formbuilder.group({
      pc_id_desc: ['', Validators.required],
      pc_id: [''],
      type_id: [''],
      ord_status: [''],
      date: [moment().format('YYYY-MM-DD')],
      souce: [environment.source],
      for: ['order-packing']
    });
  }

  ionViewDidEnter() {
    // API turant hit mat karo. Pehle mode chooser dikhao;
    // "Order Wise" chunne ke baad hi order API hit hogi.
    if (this.packMode === 'order') {
      this.search();
    } else {
      this.isChooserOpen = true;
    }
  }

  // Modal choice: Order Wise -> current order-wise flow (ab API hit)
  chooseOrderWise() {
    this.packMode = 'order';
    this.isChooserOpen = false;
    this.search();
  }

  // Modal choice: Recipe Wise -> item-wise packing (Screen 1)
  chooseRecipeWise() {
    // Pehle modal band karo, phir navigate. Warna open overlay router
    // transition ko block kar deta hai aur chooser stuck reh jaata hai.
    this.isChooserOpen = false;
    setTimeout(() => {
      this.router.navigate(['/today-order/item-pack']);
    }, 250);
  }

  // Header se mode dobara switch karne ke liye
  openChooser() {
    this.isChooserOpen = true;
  }

  // Chooser close — sirf modal band (koi navigation nahi)
  closeChooser() {
    this.isChooserOpen = false;
  }

  search() {
    let date = this.forms.value.date;
    this.forms.get('date')?.setValue(moment(date).format('YYYY-MM-DD'));
    this.getOrderForDispatch(this.forms.value);

  }

  getOrderForDispatch(obj: Object) {
    this.packingArr = [];
    this.presentLoading().then(preLoad => {
      this.httpTo.getOrderForDispatch(obj).subscribe({
        next:(data: any) => {
          if (data.status) {
            this.packingArr = data.data.OrderConfirm;
          } else {
            this.common.presentToast(data.msg, 'warning');
          }
        },
        error:() => {
          this.dismissloading();
          this.common.presentToast(environment.errMsg, 'danger');
        },
        complete:() => {
          this.isApiHit = true;
          this.dismissloading();
        }
      })
    })
  }

  openPage(dat: any) {
    this.router.navigate(['/today-order/order-pack-detail'], {
      queryParams: {
        data: JSON.stringify(dat),
      }
    });
  }

  getMealType() {
    this.httpComplaint.getMealType().subscribe({
      next:(data) => {
        if (data.status) {
          this.typeArr = data.data;
        } else {
          this.common.presentToast(data.msg, 'warning');
        }
      },
      error:() => {
        this.common.presentToast(environment.errMsg + ' Err: Meal Type', 'danger');
      },
      complete:() => {
      }
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


  getOrderStatus() {
    this.httpComplaint.getOrderStatus().subscribe({
      next:(data) => {
        if (data.status) {
          this.orderStatusArr =  data.data
        } else {
          this.common.presentToast(data.msg, 'warning');
        }
      },
      error:() => {
        this.common.presentToast(environment.errMsg, 'danger');
      },
      complete:() => {

      }
    })
  }

getStatus() {}
  async openSiteModal() {
    const modal = await this.modalController.create({
      component: CpuSiteComponent,
      cssClass: 'my-modal',
      componentProps : {

      }
    });
    modal.onWillDismiss().then(disModal => {
      console.log(disModal);
      if (disModal.data) {
        this.forms.get('pc_id_desc')?.setValue(disModal.data.label);
        this.forms.get('pc_id')?.setValue(disModal.data.value);
      } else {
      }
    });
    return await modal.present();
  }


  changeDate(dat: any) {
    console.log(dat);
    if (dat.fulldate !== moment().format('YYYY-MM-DD')) {
      this.common.presentToast(`You can Pack only Today Date`, 'warning');
    }
    return;
    this.slides.slideTo(dat.ind - 3);
    for (var i = 0 ; i < this.dateArr.length; i++) {
      if (dat.date == this.dateArr[i].date) {
        this.dateArr[i].isSelect= true
        console.log(this.dateArr[i]);
        this.forms.get('date')?.setValue(this.dateArr[i].fulldate);
        this.search();
      } else {
        this.dateArr[i].isSelect= false
      }
    }
  }
}
