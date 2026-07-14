import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ActionSheetController, LoadingController, ModalController, Platform } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { TodayOrderService } from 'src/app/provider/today-order/today-order.service';
import { environment } from 'src/environments/environment';
import { OrderPackingModalComponent } from '../order-packing-modal/order-packing-modal.component';

/**
 * Screen 2 (Recipe -> sites) — ek recipe ke saare orders/sites + qty breakdown.
 * Packing order-packing-detail jaisa hi: LINK -> pack-type action sheet ->
 * cambro (site_id ke cambros load -> scan) ya non-cambro -> order-packing-modal
 * -> per-row updte_order_recipe_packing_qty. "View" -> order-pack-detail (finalPack).
 * Data: API-2 (meal/cpu-mgr/recipe-orders).
 */
@Component({
  selector: 'app-item-packing-detail',
  templateUrl: './item-packing-detail.component.html',
  styleUrls: ['./item-packing-detail.component.scss'],
})
export class ItemPackingDetailComponent implements OnInit {
  requestedData: any = {};   // Screen 1 se aaya recipe (recipe_id, recipe_name, meal_type_id)
  basicDetails: any = {};    // API-2 header (recipe_name, total, packed, packed_pct...)
  counts: any = {};          // API-2 counts (pending / partial / packed)
  siteArr: any[] = [];       // API-2 orders[] — har site/order + qty
  statusFilter = 'all';      // all | pending | partial | packed
  packTypeArr: any = [];
  cambroArr: any = [];
  scanData: any = {};
  loading: any;
  webCambroIndex = 0;

  constructor(
    private activeRoute: ActivatedRoute,
    private httpTo: TodayOrderService,
    private common: CommonService,
    private loadingController: LoadingController,
    private router: Router,
    private actionSheetCtrl: ActionSheetController,
    private modalCtrl: ModalController,
    private platform: Platform
  ) { }

  ngOnInit() {
    this.activeRoute.queryParams.subscribe((res) => {
      this.requestedData = JSON.parse(res['data']);
      this.getRecipeOrders();
    });
    this.getPackingType();
  }

  getPackingType() {
    this.httpTo.getPackingType().subscribe({
      next: (data) => {
        if (data.status) {
          this.packTypeArr = data.data;
        }
      },
      error: () => { },
      complete: () => { }
    });
  }

  // API-2: meal/cpu-mgr/recipe-orders?meal_type_id=&recipe_id=
  getRecipeOrders() {
    this.siteArr = [];
    this.presentLoading().then(preLoad => {
      this.httpTo.getRecipeOrders(this.requestedData.meal_type_id, this.requestedData.recipe_id).subscribe({
        next: (data) => {
          if (data.status) {
            this.basicDetails = (data.data && data.data.header) || {};
            this.counts = (data.data && data.data.counts) || {};
            this.siteArr = (data.data && data.data.orders) || [];
          } else {
            this.common.presentToast(data.msg, 'warning');
          }
        },
        error: () => {
          this.dismissloading();
          this.common.presentToast(environment.errMsg, 'danger');
        },
        complete: () => {
          this.dismissloading();
        }
      });
    });
  }

  // Cambro scan ke baad yahan wapas aate hain -> modal khol do (per-row save)
  ionViewDidEnter() {
    const bar = this.common.getBarcode();
    if (!bar) {
      return;
    }
    this.common.setBarcode('');

    let qrNo = this.common.decryptValue(bar);
    if (!this.platform.is('capacitor')) {
      // sirf WEB testing: loaded cambro list me se agla de do
      if (this.cambroArr.length) {
        qrNo = this.cambroArr[this.webCambroIndex % this.cambroArr.length].ext_asset_id;
        this.webCambroIndex++;
      }
    }

    const found = this.cambroArr.filter((c: any) => c.ext_asset_id === qrNo);
    if (found.length === 0) {
      this.common.presentToast(`You are Scanning Wrong QR ${qrNo}`, 'warning');
      return;
    }
    this.openModal(found[0], '0', qrNo);
  }

  // LINK -> pack type action sheet (order-packing-detail jaisa)
  async presentActionSheet1(site: any) {
    const buttons = this.packTypeArr.map((item: any) => {
      return {
        text: item.label,
        handler: () => {
          this.handleButtonClick(item, site);
        }
      };
    });
    buttons.push({
      text: 'Cancel',
      role: 'cancel',
      handler: () => { }
    });
    const actionSheet = await this.actionSheetCtrl.create({
      mode: 'ios',
      buttons: buttons
    });
    await actionSheet.present();
  }

  handleButtonClick(selectedItem: any, site: any) {
    // item_id = recipe_id (confirmed). order_id + txn_id order object se (...site spread).
    // NOTE: pack save ko txn_id chahiye -> recipe-orders orders[] me `txn_id` add hona chahiye
    //       (warna "Order items not found"). item_id recipe_id se aa jayega.
    this.scanData = {
      ...site,
      item_id: this.requestedData.recipe_id || this.basicDetails.recipe_id,
      item_name: this.basicDetails.recipe_name || this.requestedData.recipe_name,
      order_qty: site.requested,
      ttl_left_portion: site.left,
      total_cambro_packed: site.packed
    };
    if (selectedItem.value === 39) {
      // Cambro Box -> us site ke cambros load karo, phir scanner
      this.loadCambroThenScan(site.site_id);
    } else {
      // Non-cambro -> seedha modal (identify key)
      this.openModal(this.scanData, '1', '', selectedItem.label, selectedItem.value);
    }
  }

  // Cambro Box: site_id ke cambros getCambroByPC se laao, phir /barcode
  loadCambroThenScan(site_id: any) {
    this.cambroArr = [];
    this.presentLoading().then(preLoad => {
      this.httpTo.getCambroByPC(site_id).subscribe({
        next: (data) => {
          if (data.status) {
            this.cambroArr = data.data;
            this.router.navigateByUrl('/barcode');
          } else {
            this.common.presentToast(data.msg, 'warning');
          }
        },
        error: () => {
          this.dismissloading();
          this.common.presentToast(environment.errMsg, 'danger');
        },
        complete: () => {
          this.dismissloading();
        }
      });
    });
  }

  // order-packing-modal reuse — submit hone par khud per-row save karta hai,
  // dismiss (role=true) par site list refresh.
  async openModal(obj: any, pack_type: any, pack_no: any, select_type?: string, type_id?: number) {
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
        this.getRecipeOrders();
      }
    });
    modal.present();
  }

  // Site card ka "View" -> order-wise detail page (wahan se finalPack).
  viewOrder(site: any) {
    this.router.navigate(['/today-order/order-pack-detail'], {
      queryParams: {
        // hidePack: Screen 2 se aaye to Pack (finalize) button hide — pack sirf order-wise
        data: JSON.stringify({ order_id: site.order_id, hidePack: true }),
      }
    });
  }

  // Status filter (client side)
  get filteredSites(): any[] {
    return this.siteArr.filter((s: any) => this.statusFilter === 'all' || s.status === this.statusFilter);
  }

  setStatusFilter(val: string) {
    this.statusFilter = val;
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
