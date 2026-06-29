import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ActionSheetController, AlertController, LoadingController, ModalController, NavController, Platform } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { TodayOrderService } from 'src/app/provider/today-order/today-order.service';
import { environment } from 'src/environments/environment';
import { MyAssetGetService } from 'src/app/provider/my-asset-get/my-asset-get.service';
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
  scanValue = 0;
  scanData: any = {};
  isModalOpen = false;
  packCambro: any = {};
  isDriverModal = false;
  packTypeArr: any = [];
  packingList: any[] = []; // all locally-collected pack entries, submitted at once on "Pack"
  // WEB-ONLY testing: cycle through available cambros so multi-cambro scan can be tested.
  // On Android/iOS the real scanned barcode is always used.
  webTestCambros: string[] = [
    '1008347809', '1008123212', '1008232123',
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
    private modal: ModalController,
    private alertCtrl: AlertController,
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

  ionViewDidEnter() {
    let bar = this.common.getBarcode();
    if (bar) {
      this.common.setBarcode('');
      let decBarcode = this.common.decryptValue(bar);
      if (!this.platform.is('capacitor')) {
        // WEB testing only: return next available cambro so each scan differs
        decBarcode = this.webTestCambros[this.webCambroIndex % this.webTestCambros.length];
        this.webCambroIndex++;
      }
      const obj = this.cambroArr.filter((val: any) => val.ext_asset_id === decBarcode);
      if (obj.length > 0) {
        // same cambro box can't be scanned twice for this order
        const already = this.packingList.some((p: any) => p.pack_type === '0' && p.camro_box_id === obj[0].cambro_id);
        if (already) {
          this.common.presentToast(`This Cambro is already scanned (${decBarcode})`, 'warning');
          return;
        }
        this.addCambroPack(obj[0]);
      } else {
        this.common.presentToast(`You are Scanning Wrong QR ${decBarcode}`, 'warning');
      }
    }
  }


  // Cambro flow: auto-fill the scanned box up to its size, save the entry
  // locally, then reopen the scanner until the whole recipe qty is packed.
  addCambroPack(cambro: any) {
    const item = this.scanData;
    if (!item) {
      return;
    }
    const qty = Math.min(Number(item.ttl_left_portion), Number(cambro.size));
    if (qty <= 0) {
      return;
    }
    const entry = {
      dispatch_qty: qty,
      item_id: item.item_id,
      order_id: item.order_id,
      txn_id: item.txn_id,
      pack_no: cambro.ext_asset_id,
      pack_type: '0',
      camro_box_id: cambro.cambro_id
    };
    this.applyLocalPacking(entry, '0');
    // big recipe → reopen scanner for the next cambro
    if (item.ttl_left_portion > 0) {
      this.router.navigateByUrl('/barcode');
    }
  }

  // Non-cambro flow: only ask for the identify key, pack the whole
  // remaining qty of the item into this asset.
  async promptIdentifyKey(item: any, selectedItem: any) {
    const alert = await this.alertCtrl.create({
      header: selectedItem.label,
      message: 'Enter Identify Key',
      backdropDismiss: false,
      inputs: [{ name: 'identify_key', type: 'text', placeholder: 'Identify Key' }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
          handler: (val: any) => {
            const key = (val.identify_key || '').trim();
            if (!key) {
              this.common.presentToast('Please Enter Identify Key', 'warning');
              return false;
            }
            const entry = {
              dispatch_qty: Number(item.ttl_left_portion),
              item_id: item.item_id,
              order_id: item.order_id,
              txn_id: item.txn_id,
              pack_no: key,
              pack_type: '1',
              camro_box_id: selectedItem.value
            };
            this.scanData = item;
            this.applyLocalPacking(entry, '1', selectedItem.label);
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  // Patch one pack entry into local state (no API call here). The full
  // packingList is sent in a single request when "Pack" is clicked.
  applyLocalPacking(entry: any, pack_type: any, select_type?: string) {
    const item = this.scanData;
    if (!item) {
      return;
    }
    const qty = Number(entry.dispatch_qty) || 0;
    this.packingList.push(entry);
    // update remaining / packed on the item so UI reflects immediately
    item.ttl_left_portion = Number(item.ttl_left_portion) - qty;
    if (item.ttl_left_portion < 0) {
      item.ttl_left_portion = 0;
    }
    item.total_cambro_packed = Number(item.total_cambro_packed || 0) + qty;
    if (!item.qr_data) {
      item.qr_data = [];
    }
    // chip + detail-modal data
    item.qr_data.push({
      dispatch_qty: qty,
      uom: item.uom,
      order_id: item.order_id,
      key: pack_type === '0' ? 'Cambro Box' : select_type,
      val: entry.pack_no
    });
    // mark packed only when the whole recipe qty is packed
    if (item.ttl_left_portion <= 0) {
      item.is_packed = true;
    }
    // header "Packed Recipe x/total"
    this.basicDetails.packQty = this.orderArr.filter((o: any) => o.is_packed).length;
  }

  setOpen(val: any, data: any, isOpen: boolean) {
    this.packCambro = val;
    this.packCambro.item_name = data.item_name;
    this.packCambro.pack_qty = val.dispatch_qty + '(' +val.uom + ')';

    this.isModalOpen = isOpen;
  }

  setDriveModal(isOpen: boolean, val?: any, data?: any) {
    this.isDriverModal = isOpen;
  }

  finalPack() {
    let count = 0
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
      return
    }
    // single array: one entry per item carrying its temperature + its packs
    const items = this.orderArr
      .map((o: any) => ({
        txn_id: o.txn_id,
        item_id: o.item_id,
        temperature: o.temperature,
        packs: this.packingList
          .filter((p: any) => p.txn_id === o.txn_id)
          .map((p: any) => ({
            dispatch_qty: p.dispatch_qty,
            pack_no: p.pack_no,
            pack_type: p.pack_type,
            camro_box_id: p.camro_box_id
          }))
      }))
      .filter((it: any) => it.packs.length > 0 ||
        (it.temperature !== '' && it.temperature !== null && it.temperature !== undefined));
    this.presentLoading().then(preLoad => {
      const obj = {
        order_id: this.requestedData.order_id,
        items: items
      };
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
              if (!this.platform.is('capacitor')) {
                this.orderArr[i].is_packed = false;
              }   
              // this.orderArr[i].temperature = '10';           
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

  updateTemperature(dat: any) {
    // No API call here — temperature is kept locally and submitted in one go on "Pack".
    if (dat.temperature === '' || dat.temperature === null || dat.temperature === undefined) {
      dat.is_temperature = false;
      return;
    }
    dat.is_temperature = true;
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
    let ref = this;
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
      this.scanData = data;
      this.router.navigateByUrl('/barcode');
    } else {
      this.scanData = data;
      this.promptIdentifyKey(data, selectedItem);
    }
  }

  async presentActionSheet(dat: any) {
    const actionSheet = await this.actionSheetCtrl.create({
      mode: 'ios',
      buttons: [{
        text: 'Scan Cambro Box',
        handler:() => {
          this.action(1, dat);
        }
      },{
        text: 'Scan Tray',
        handler:() => {
          this.action(2, dat);
        }
      },{
        text: 'Cancel',
        role: 'cancel',
        handler:() => {
        }
      }],
    });
    actionSheet.present();
  }

  action(val: number, data: any) {
    this.scanValue = val;
    this.scanData = data;
    this.router.navigateByUrl('/barcode');
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

  cancel() {
    this.modal.dismiss(null, 'cancel');
  }

  confirm() {
    this.modal.dismiss(null, 'confirm');
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
