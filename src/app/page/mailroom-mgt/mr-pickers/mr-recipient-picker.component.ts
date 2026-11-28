import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { MailroomService } from 'src/app/provider/mailroom/mailroom.service';

/** Recipient search (paged API, type karte hi search) */
@Component({
  selector: 'app-mr-recipient-picker',
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Recipient</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="modalCtrl.dismiss()"><ion-icon slot="icon-only" name="close-outline"></ion-icon></ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="km mr">
      <ion-searchbar [(ngModel)]="search" (ionChange)="load()" debounce="300" mode="md"
        placeholder="Name, email, department, desk"></ion-searchbar>
      <div class="km-page">
        <div class="mr-center" *ngIf="loading"><ion-spinner name="crescent" color="primary"></ion-spinner></div>
        <div class="mr-center" *ngIf="errorMsg"><p>{{ errorMsg }}</p></div>
        <div class="km-card km-row mr-tap" *ngFor="let r of list" (click)="modalCtrl.dismiss(r)">
          <div class="km-row__icon"><ion-icon name="person-outline"></ion-icon></div>
          <div class="km-row__body">
            <h3>{{ r.name }}</h3>
            <p><ion-icon name="mail-outline"></ion-icon><span>{{ r.email }}</span></p>
            <p *ngIf="r.department || r.deskLocation"><ion-icon name="business-outline"></ion-icon>
              <span>{{ r.department }} <span *ngIf="r.deskLocation">· {{ r.building }} {{ r.floor }} {{ r.deskLocation }}</span></span></p>
          </div>
        </div>
        <div class="km-empty" *ngIf="!loading && !errorMsg && !list.length">
          <ion-icon name="people-outline"></ion-icon>No recipients found
        </div>
      </div>
    </ion-content>`,
})
export class MrRecipientPickerComponent implements OnInit {
  search = '';
  list: any[] = [];
  loading = false;
  errorMsg = '';
  private seq = 0;

  constructor(public modalCtrl: ModalController, private mr: MailroomService) {}

  ngOnInit() { this.load(); }

  async load() {
    const mine = ++this.seq;
    this.loading = true;
    this.errorMsg = '';
    try {
      const res = await this.mr.recipients({ search: this.search.trim() });
      if (mine !== this.seq) { return; }   // purana jawab, naya search chal raha hai
      this.list = res.data || [];
    } catch (err) {
      if (mine !== this.seq) { return; }
      this.list = [];
      this.errorMsg = this.mr.msg(err);
    }
    this.loading = false;
  }
}
