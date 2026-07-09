import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ActionSheetController, AlertController, LoadingController, NavController, Platform } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { TodayOrderService } from 'src/app/provider/today-order/today-order.service';
import { environment } from 'src/environments/environment';
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
  packingList: any[] = []; // all locally-collected pack entries, submitted at once on "Pack"
  // WEB-ONLY testing: cycle through available cambros so multi-cambro scan can be tested.
  // On Android/iOS the real scanned barcode is always used.
  webTestCambros: string[] = [
    '1019432523', '1008123212', '1008232123',
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

  // Cambro scan ke baad yahan wapas aate hain
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
    const found = this.cambroArr.filter((c: any) => c.ext_asset_id === qrNo);
    if (found.length === 0) {
      this.common.presentToast(`You are Scanning Wrong QR ${qrNo}`, 'warning');
      return;
    }
    const cambro = found[0];

    // yeh cambro pehle se scan to nahi ho gaya
    const already = this.packingList.some((p: any) => p.pack_type === '0' && p.camro_box_id === cambro.cambro_id);
    if (already) {
      this.common.presentToast(`This Cambro is already scanned (${qrNo})`, 'warning');
      return;
    }

    this.addCambroPack(cambro);
  }


  // CAMBRO: ek box me uski size jitni qty bharo, save karo, aur agar
  // abhi qty bachi hai to scanner dobara khol do (agla cambro).
  addCambroPack(cambro: any) {
    const item = this.scanData;

    // is cambro me kitni qty aayegi (box size ya bachi qty, jo chhoti ho)
    let qty = item.ttl_left_portion;
    const size = Number(cambro.size);
    if (qty > size) {
      qty = size;
    }
    if (qty <= 0) {
      console.log('zero');
      return;
    }

    const entry = {
      dispatch_qty: qty,
      item_id: item.item_id,
      order_id: item.order_id,
      txn_id: item.txn_id,
      pack_no: cambro.ext_asset_id,   // QR number
      pack_type: '0',                 // 0 = cambro
      camro_box_id: cambro.cambro_id  // cambro ki id
    };
    this.addToPackingList(item, entry, 'Cambro Box');

    // qty abhi bhi bachi hai to agla cambro scan karo
    if (item.ttl_left_portion > 0) {
      this.router.navigateByUrl('/barcode');
    }
  }

  // NON-CAMBRO (Tray/Handi/Ice Box/Silver Pouch): sirf identify key poocho
  // aur item ki poori bachi qty isi asset me pack kar do.
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
              return false; // alert khula rehne do
            }
            const entry = {
              dispatch_qty: item.ttl_left_portion,
              item_id: item.item_id,
              order_id: item.order_id,
              txn_id: item.txn_id,
              pack_no: key,                     // identify key
              pack_type: '1',                   // 1 = non-cambro
              camro_box_id: selectedItem.value  // pack type ki value
            };
            this.scanData = item;
            this.addToPackingList(item, entry, selectedItem.label);
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  // Ek pack ko local list me daalo aur screen par item update karo.
  // (Yahan koi API call nahi — sab "Pack" button par ek saath jaata hai.)
  addToPackingList(item: any, entry: any, typeLabel: string) {
    // 1. pack ko list me rakho (baad me submit hoga)
    this.packingList.push(entry);

    // 2. item ki bachi qty kam karo
    item.ttl_left_portion = item.ttl_left_portion - entry.dispatch_qty;
    if (item.ttl_left_portion <= 0) {
      item.ttl_left_portion = 0;
      item.is_packed = true; // poora pack ho gaya
    }

    // 3. screen par ek chhota chip dikhao
    if (!item.qr_data) {
      item.qr_data = [];
    }
    item.qr_data.push({
      dispatch_qty: entry.dispatch_qty,
      uom: item.uom,
      order_id: item.order_id,
      key: typeLabel,
      val: entry.pack_no
    });

    // 4. header ka "Packed Recipe x/total" update karo
    this.basicDetails.packQty = this.getPackedCount();
  }

  // kitne item pack ho chuke
  getPackedCount() {
    let count = 0;
    for (let i = 0; i < this.orderArr.length; i++) {
      if (this.orderArr[i].is_packed) {
        count++;
      }
    }
    return count;
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
    // check: har item ki temperature + packing honi chahiye
    let notReady = 0;
    for (let i = 0; i < this.orderArr.length; i++) {
      const item = this.orderArr[i];
      if (!item.is_temperature || !item.is_packed) {
        item.err = true;
        notReady++;
      } else {
        item.err = false;
      }
    }
    if (notReady > 0) {
      this.common.presentToast('Please mention the temperature and pack all the receipe', 'warning');
      return;
    }

    // ek array banao: har item ke saath uski temperature + uske packs
    const items: any[] = [];
    for (let i = 0; i < this.orderArr.length; i++) {
      const item = this.orderArr[i];

      // is item ke packs nikalo (packingList me se same txn_id wale)
      const packs: any[] = [];
      for (let j = 0; j < this.packingList.length; j++) {
        const p = this.packingList[j];
        if (p.txn_id === item.txn_id) {
          packs.push({
            dispatch_qty: p.dispatch_qty,
            pack_no: p.pack_no,
            pack_type: p.pack_type,
            camro_box_id: p.camro_box_id
          });
        }
      }

      items.push({
        txn_id: item.txn_id,
        item_id: item.item_id,
        temperature: item.temperature,
        packs: packs
      });
    }

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
              // server ab default temperature bhej raha hai -> agar value already hai
              // to use valid maano (warna submit block ho jaata hai)
              const temp = this.orderArr[i].temperature;
              this.orderArr[i].is_temperature = temp !== '' && temp !== null && temp !== undefined;
              // if (!this.platform.is('capacitor')) {
              //   this.orderArr[i].is_packed = false;
              // }
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
