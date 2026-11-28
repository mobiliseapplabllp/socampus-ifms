import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { MailroomService } from 'src/app/provider/mailroom/mailroom.service';

/** Storage unit chunna. Bhari hui ya is package type ko na lene wali units disabled. */
@Component({
  selector: 'app-mr-storage-picker',
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Storage unit</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="modalCtrl.dismiss()"><ion-icon slot="icon-only" name="close-outline"></ion-icon></ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="km mr">
      <ion-searchbar [(ngModel)]="search" mode="md" placeholder="Search code, building"></ion-searchbar>
      <div class="km-page">
        <div class="mr-center" *ngIf="loading"><ion-spinner name="crescent" color="primary"></ion-spinner></div>
        <div class="km-card km-row mr-tap" *ngFor="let u of filtered()" [class.mr-disabled]="reason(u)" (click)="pick(u)">
          <div class="km-row__icon"><ion-icon name="file-tray-stacked-outline"></ion-icon></div>
          <div class="km-row__body">
            <h3>{{ u.code }} <small class="ion-text-capitalize">· {{ u.type }}</small></h3>
            <p><ion-icon name="location-outline"></ion-icon><span>{{ u.building }} {{ u.floor }} {{ u.zone }}</span></p>
            <div class="mr-bar"><span [style.width.%]="fill(u)" [class.mr-bar--warn]="fill(u) >= 75" [class.mr-bar--full]="fill(u) >= 100"></span></div>
            <p><span>{{ u.currentOccupancy }} / {{ u.capacity }}</span><span *ngIf="reason(u)"> · {{ reason(u) }}</span></p>
          </div>
        </div>
        <div class="km-empty" *ngIf="!loading && !filtered().length">
          <ion-icon name="file-tray-outline"></ion-icon>No storage units
        </div>
      </div>
    </ion-content>`,
})
export class MrStoragePickerComponent implements OnInit {
  @Input() packageType = '';
  units: any[] = [];
  search = '';
  loading = true;

  constructor(public modalCtrl: ModalController, private mr: MailroomService) {}

  async ngOnInit() {
    // occupancy badalti rehti hai, isliye har baar taza list
    this.units = await this.mr.loadStorageUnits();
    this.loading = false;
  }

  filtered(): any[] {
    const q = this.search.trim().toLowerCase();
    if (!q) { return this.units; }
    return this.units.filter(u => [u.code, u.building, u.floor, u.zone, u.type].join(' ').toLowerCase().includes(q));
  }

  fill(u: any): number { return u.capacity ? Math.round((u.currentOccupancy / u.capacity) * 100) : 0; }
  reason(u: any): string { return this.mr.storageBlockReason(u, this.packageType); }

  pick(u: any) {
    if (!this.reason(u)) { this.modalCtrl.dismiss(u); }
  }
}
