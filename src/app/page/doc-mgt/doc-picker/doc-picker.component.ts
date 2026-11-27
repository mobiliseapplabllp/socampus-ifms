import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';

// Chhota searchable picker: items = [{ id, name }]
@Component({
  selector: 'app-doc-picker',
  templateUrl: './doc-picker.component.html',
  styleUrls: ['./doc-picker.component.scss'],
})
export class DocPickerComponent implements OnInit {
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
    this.filtered = (this.items || []).filter(item => String(item.name || '').toLowerCase().includes(val));
  }

  closeModal(val: any, status: any) {
    this.modalCtrl.dismiss(val, status);
  }

}
