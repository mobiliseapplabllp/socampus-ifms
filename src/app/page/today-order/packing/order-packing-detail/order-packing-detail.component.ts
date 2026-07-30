import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ActionSheetController, LoadingController, ModalController, NavController, Platform } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { TodayOrderService } from 'src/app/provider/today-order/today-order.service';
import { environment } from 'src/environments/environment';
import { OrderPackingModalComponent } from '../order-packing-modal/order-packing-modal.component';
@Component({
  selector: 'app-order-packing-detail',
  templateUrl: './order-packing-detail.component.html',
  styleUrls: ['./order-packing-detail.component.scss'],
})
export class OrderPackingDetailComponent  implements OnInit {
  requestedData: any = [];
  loading: any;
  orderArr: any = [];
  basicDetails: any = {};
  driverArr: any = [];
  selectedDriver: any;
  cambroArr: any = [];
  scanData: any = {};
  isModalOpen = false;
  packCambro: any = {};
  isDriverModal = false;
  packTypeArr: any = [];
  // WEB-ONLY testing: cycle through available cambros so multi-cambro scan can be tested.
  // On Android/iOS the real scanned barcode is always used.
  webTestCambros: string[] = [
    '1863150063', '1008123212', '1008232123',
    '1008432213', '1008232133', '1008145243'
  ];
  webCambroIndex = 0;
  constructor(
    private activeRoute: ActivatedRoute,
    private httpTo: TodayOrderService,
    private loadingController: LoadingController,
    private common: CommonService,
    private actionSheetCtrl: ActionSheetController,
    private router: Router,
    private modalCtrl: ModalController,
    private navCtrl: NavController,
    private platform: Platform
  ) { }

  ngOnInit() {
    this.activeRoute.queryParams.subscribe((res) => {
      this.requestedData = JSON.parse(res['data']);
    });
    this.getDispathOrderDetail(this.requestedData.order_id);
    this.getPackingType();
  }

  getPackingType() {
    this.httpTo.getPackingType().subscribe({
      next:(data) => {
        if (data.status) {
          this.packTypeArr = data.data;
        } else {
          this.common.presentToast(data.msg, 'warning');
        }
      },
      error:() => {
        this.common.presentToast(environment.errMsg, 'danger');
      },
      complete:() => {

      }
    });
  }

  // Cambro scan ke baad yahan wapas aate hain -> modal khol do (per-row save)
  ionViewDidEnter() {
    const bar = this.common.getBarcode();
    if (!bar) {
      return;
    }
    this.common.setBarcode('');

    // scanned QR number
    let qrNo = this.common.decryptValue(bar);
    if (!this.platform.is('capacitor')) {
      // sirf WEB testing: list me se agla cambro de do taki har scan alag ho
      qrNo = this.webTestCambros[this.webCambroIndex % this.webTestCambros.length];
      this.webCambroIndex++;
    }

    // is QR ka cambro available list me hai ya nahi
    const obj = this.cambroArr.filter((val: any) => val.ext_asset_id === qrNo);
    if (obj.length > 0) {
      this.openModal(obj[0], '0', qrNo);
    } else {
      this.common.presentToast(`You are Scanning Wrong QR ${qrNo}`, 'warning');
    }
  }

  // Packing modal kholo. Submit hone par modal khud server pe ek row save karta hai
  // (updte_order_recipe_packing_qty), phir yahan wapas aakar screen refresh ho jati hai.
  async openModal(obj: Object, pack_type: any, pack_no: any, select_type?: string, type_id?: number) {
    const modal = await this.modalCtrl.create({
      component: OrderPackingModalComponent,
      cssClass: 'my-modal',
      backdropDismiss: false,
      componentProps: {
        scanData: this.scanData,
        cambroData: obj,
        pack_type: pack_type,
        pack_no: pack_no,
        select_type: select_type,
        type_id: type_id
      }
    });
    modal.onWillDismiss().then((disModal: any) => {
      if (disModal.role == true) {
        this.getDispathOrderDetail(this.requestedData.order_id);
      }
    });
    modal.present();
  }

  setOpen(val: any, data: any, isOpen: boolean) {
    // close karte waqt purana data rakho, warna dismiss animation me blank flash hota hai
    if (isOpen) {
      this.packCambro = { ...val, item_name: data.item_name };
    }

    this.isModalOpen = isOpen;
  }

  setDriveModal(isOpen: boolean, val?: any, data?: any) {
    this.isDriverModal = isOpen;
  }

  // Packing + temperature pehle hi per-row save ho chuke; yahan sirf finalize.
  finalPack() {
    let count = 0;
    for (var i = 0; i < this.orderArr.length; i++) {
      if (!this.orderArr[i].is_temperature || !this.orderArr[i].is_packed) {
        this.orderArr[i].err = true;
        count = count + 1;
      } else {
        this.orderArr[i].err = false;
      }
    }
    if (count > 0) {
      this.common.presentToast('Please mention the temperature and pack all the receipe', 'warning');
      return;
    }
    this.presentLoading().then(preLoad => {
      const obj = [{ order_id: this.requestedData.order_id }];
      this.httpTo.actionOrderPack(obj).subscribe({
        next:(data) => {
          console.log(data);
          if (data.status) {
            this.common.presentToast(data.msg, 'success');
            this.navCtrl.pop();
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
    });
  }

  onWillDismiss(){
    this.isModalOpen = false
  }

  onWillDismissDriver() {
    this.isDriverModal = false
  }

  getDispathOrderDetail(order_id: any) {
    this.presentLoading().then(preLoad => {
      this.httpTo.getDispathOrderDetail(order_id).subscribe({
        next:(data) => {
          if (data.status) {
            this.basicDetails = data.data;
            this.orderArr = data.txn_data;
            let packQty = 0
            for(var i = 0 ; i < this.orderArr.length; i++) {
              if(this.orderArr[i].is_packed) {
                packQty = packQty + 1;
              }
              // server default temperature bhejta hai -> value already ho to valid maano
              const temp = this.orderArr[i].temperature;
              this.orderArr[i].is_temperature = temp !== '' && temp !== null && temp !== undefined;
            }
            this.basicDetails.packQty = packQty
            this.getCamroByPc(this.basicDetails.cpu_pc_id);
            this.getDriverByPc(this.basicDetails.pc_id);
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

  changeTemp(dat: any) {
    if (dat.temperature < -20  || dat.temperature > 100) {
      dat.temperature = '';
      this.common.presentToast('Temperature accept only -20 to 100 degree only', 'warning');
      return;
    }
  }

  // Har item ki temperature turant server pe save (updte_order_recipe_temp).
  updateTemperature(dat: any) {
    if (!dat.temperature) {
      dat.is_temperature = false;
      return;
    }
    const obj = {
      temperature: dat.temperature,
      txn_id: dat.txn_id
    }
    this.presentLoading().then(preLoad => {
      this.httpTo.updateTemperature(obj).subscribe({
        next:(data) => {
          if (data.status) {
            this.common.presentToast(data.msg, 'success');
            dat.is_temperature = true
          } else {
            this.common.presentToast(data.msg, 'warning');
            dat.is_temperature = false
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
    });
  }

  getCamroByPc(pc_id: string) {
    this.cambroArr = [];
    this.httpTo.getCambroByPC(pc_id).subscribe({
      next:(data) => {
        if (data.status) {
          this.cambroArr = data.data;
        } else {
          this.common.presentToast(data.msg, 'warning');
        }
      },
      error:() => {

      },
      complete:() => {

      }
    })
  }

  getDriverByPc(pc_id: string) {
    this.httpTo.getDriverByPc(pc_id).subscribe({
      next:(data) => {
        if (data.status) {
          this.driverArr = data.data;
          this.driverArr = this.driverArr.filter((val: any) => val.driver_id !== this.basicDetails.driver_id);
        }
      },
      error:() => {

      },
      complete:() => {

      }
    })
  }

  async presentActionSheet1(dat: any) {
    const buttons = this.packTypeArr.map((item: any) => {
      return {
        text: item.label,
        handler: () => {
          this.handleButtonClick(item, dat);
        }
      };
    });

    buttons.push({
      text: 'Cancel',
      role: 'cancel',
      handler: () => {
        console.log('Action sheet cancelled');
      }
    });
    const actionSheet = await this.actionSheetCtrl.create({
      mode: 'ios',
      buttons: buttons
    });

    await actionSheet.present();
  }

  handleButtonClick(selectedItem: any, data: any) {
    if (selectedItem.value === 39) {
      // Cambro Box -> scanner kholo, scan ke baad ionViewDidEnter modal khol dega
      this.scanData = data;
      this.router.navigateByUrl('/barcode');
    } else {
      // Non-cambro (Tray/Handi/Ice Box/Silver Pouch) -> seedha modal (identify key)
      this.scanData = data;
      this.openModal(data, '1', '', selectedItem.label, selectedItem.value);
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

  changeDriver() {
    if (!this.selectedDriver) {
      this.common.presentToast('Please Select Driver', 'warning');
      return;
    }
    const driver = this.driverArr.filter((val: any) => val.driver_id === this.selectedDriver)[0];
    const obj = {
      order_id: this.basicDetails.order_id,
      driver_details: driver
    }
    this.presentLoading().then(preLoad => {
      this.httpTo.updateDriver(obj).subscribe({
        next:(data) => {
          if (data.status) {
            this.isDriverModal = false;
            this.selectedDriver = null;
            this.common.presentToast(data.msg, 'success');
            this.getDispathOrderDetail(this.requestedData.order_id);
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
    });
  }
}
