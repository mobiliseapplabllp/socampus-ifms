import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { LoadingController } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { IndentsService } from 'src/app/provider/indents/indents.service';
@Component({
  selector: 'app-indent-card',
  templateUrl: './indent-card.component.html',
  styleUrls: ['./indent-card.component.scss'],
})
export class IndentCardComponent implements OnInit {
  @Input() data: any;
  @Input() type: any;
  @Output() greetEvent = new EventEmitter();
  loading: any;
  constructor(
    private common: CommonService,
    private httpIndent: IndentsService,
    private loadingController: LoadingController
  ) { }

  ngOnInit() {}

  openDoc(url: string, blobType: string) {
    this.common.openImg(url, blobType);
  }

  cancel(data: any) {
    let arr: any = [];
    arr.push(data);
    this.presentLoading().then(preLoad => {
      this.httpIndent.cancelIndent(arr).subscribe(data=> {
        this.dismissloading();
        if (data.status) {
          this.common.presentToast(data.msg, 'success');
          this.greetEvent.emit(data);
        } else {
          this.common.presentToast(data.msg, 'warning');
        }
      });
    })
  }

  async presentLoading() {
    this.loading = await this.loadingController.create({
      cssClass: 'my-custom-class',
      message: 'Please wait...',
    });
    await this.loading.present();
  }

  async dismissloading() {
    if (this.loading) {
      this.loading.dismiss();
    }
  }

}
