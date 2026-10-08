import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
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
  ) { }

  ngOnInit() {}

  openDoc(url: string, blobType: string) {
    this.common.openImg(url, blobType);
  }

  cancel(data: any) {
    let arr: any = [];
    arr.push(data);
    this.common.presentLoading().then(preLoad => {
      this.httpIndent.cancelIndent(arr).subscribe(data=> {
        this.common.dismissloading();
        if (data.status) {
          this.common.presentToast(data.msg, 'success');
          this.greetEvent.emit(data);
        } else {
          this.common.presentToast(data.msg, 'warning');
        }
      });
    })
  }

}
