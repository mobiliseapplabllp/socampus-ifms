import { Component, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';

/**
 * "Allow all the time" Android khud nahi poochta - wo sirf Settings se milti hai.
 * Seedha Settings khol dene par engineer wahan pahunch kar atak jaata tha, isliye
 * pehle ye guide: teen step, har step ki apni photo jisme laal ghera hai.
 */
@Component({
  selector: 'app-permission-guide',
  templateUrl: './permission-guide.component.html',
  styleUrls: ['./permission-guide.component.scss'],
})
export class PermissionGuideComponent {

  /** Settings khulne par modal band ho jaata hai - wapas aane par list khud refresh hoti hai */
  @Input() title = 'Allow location all the time';
  @Input() intro = 'Location tracking needs "Allow all the time". Android lets you set this only from Settings — just three taps:';

  steps = [
    {
      text: 'Open Permissions',
      image: 'assets/permission/step1.jpg'
    },
    {
      text: 'Open Location',
      image: 'assets/permission/step2.jpg'
    },
    {
      text: 'Select Allow all the time',
      image: 'assets/permission/step3.jpg'
    }
  ];

  constructor(private modalCtrl: ModalController) {}

  close(): void {
    void this.modalCtrl.dismiss({ open: false });
  }

  /** Card ko pata chal jaata hai ki Settings kholni hai */
  openSettings(): void {
    void this.modalCtrl.dismiss({ open: true });
  }
}
