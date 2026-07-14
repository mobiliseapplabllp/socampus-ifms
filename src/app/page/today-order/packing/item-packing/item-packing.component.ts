import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { ComplaintService } from 'src/app/provider/complaint/complaint.service';
import { TodayOrderService } from 'src/app/provider/today-order/today-order.service';
import { environment } from 'src/environments/environment';

/**
 * Screen 1 (Item / Recipe-wise packing) — saare distinct items ka aggregated list/dashboard.
 * Item pe click -> item-pack-detail (item -> sites).
 * Data: API-1 (distinct items) — abhi backend ready hone par integrate hoga.
 * Meal type selector abhi se live hai (ComplaintService.getMealType).
 */
@Component({
  selector: 'app-item-packing',
  templateUrl: './item-packing.component.html',
  styleUrls: ['./item-packing.component.scss'],
})
export class ItemPackingComponent implements OnInit {
  mealTypeArr: any[] = [];     // getMealType() dropdown -> {value, label}
  selectedMealType: any;       // chosen meal type value
  itemArr: any[] = [];         // API-1: distinct items (orders ke aar-paar aggregate)
  summary: any = {             // API-1: dashboard summary (defaults so UI abhi render ho)
    total_qty: 0, packed_qty: 0, readiness_percent: 0, time_left_min: 0,
    pending_count: 0, active_count: 0, done_count: 0
  };
  statusFilter = 'all';        // all | pending | in-progress | completed
  searchText = '';
  loading: any;
  isApiHit = false;

  constructor(
    private httpTo: TodayOrderService,
    private httpComplaint: ComplaintService,
    private common: CommonService,
    private loadingController: LoadingController,
    private router: Router
  ) { }

  ngOnInit() {
    this.getMealType();
    // TODO(API-1): getItemWisePacking(mealType) -> itemArr + summary bharna.
  }

  // Meal type dropdown — meal/meal-type/get/dropdown
  getMealType() {
    this.httpComplaint.getMealType().subscribe({
      next: (data) => {
        if (data.status) {
          this.mealTypeArr = data.data;
        } else {
          this.common.presentToast(data.msg, 'warning');
        }
      },
      error: () => {
        this.common.presentToast(environment.errMsg + ' Err: Meal Type', 'danger');
      },
      complete: () => { }
    });
  }

  // Meal type change -> us meal type ki recipe list (API-1)
  onMealTypeChange() {
    if (this.selectedMealType === undefined || this.selectedMealType === null || this.selectedMealType === '') {
      return;
    }
    this.getRecipeList();
  }

  // API-1: meal/cpu-mgr/recipe-list?meal_type_id=
  getRecipeList() {
    this.itemArr = [];
    this.presentLoading().then(preLoad => {
      this.httpTo.getRecipeList(this.selectedMealType).subscribe({
        next: (data) => {
          this.isApiHit = true;
          if (data.status) {
            this.itemArr = (data.data && data.data.items) || [];
            const h = (data.data && data.data.header) || {};
            const c = (data.data && data.data.counts) || {};
            this.summary = {
              total_qty: h.total || 0,
              packed_qty: h.prepared || 0,
              readiness_percent: h.dispatch_readiness_pct || 0,
              time_left_min: h.est_time_left_min || 0,
              pending_count: c.pending || 0,
              active_count: c.active || 0,
              done_count: c.done || 0
            };
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

  // Status + search filter (client side)
  get filteredItems(): any[] {
    const q = (this.searchText || '').toLowerCase().trim();
    return this.itemArr.filter((it: any) => {
      const okStatus = this.statusFilter === 'all' || it.status === this.statusFilter;
      const okSearch = !q || (it.recipe_name || '').toLowerCase().includes(q);
      return okStatus && okSearch;
    });
  }

  setStatusFilter(val: string) {
    this.statusFilter = val;
  }

  // Item pe click -> Screen 2 (item -> sites + qty)
  openItem(item: any) {
    this.router.navigate(['/today-order/item-pack-detail'], {
      queryParams: {
        data: JSON.stringify({ ...item, meal_type_id: this.selectedMealType }),
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
}
