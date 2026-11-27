import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';

// Chhota searchable picker: items = [{ value, label }]
@Component({
  selector: 'app-incident-picker',
  templateUrl: './incident-picker.component.html',
  styleUrls: ['./incident-picker.component.scss'],
})
export class IncidentPickerComponent implements OnInit {
  @Input() title = 'Select';
  @Input() items: any[] = [];
  filtered: any[] = [];

  constructor(
    private modalCtrl: ModalController
  ) { }

  ngOnInit() {
    this.filtered = this.items || [];
  }

  search(ev: any) {
    const val = String(ev.target.value || '').toLowerCase();
    this.filtered = (this.items || []).filter(item => String(item.label || '').toLowerCase().includes(val));
  }

  closeModal(val: any, status: any) {
    this.modalCtrl.dismiss(val, status);
  }

}
