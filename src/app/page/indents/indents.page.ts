import { Component, OnInit } from '@angular/core';
import { environment } from '../../../environments/environment';
import { IndentsService } from 'src/app/provider/indents/indents.service';
import { CommonService } from 'src/app/provider/common/common.service';
@Component({
  selector: 'app-indents',
  templateUrl: './indents.page.html',
  styleUrls: ['./indents.page.scss'],
})
export class IndentsPage implements OnInit {
  status = 'pending';
  page = 1;
  indentView: any = [];
  loading: any;
  constructor(
    private httpIndent: IndentsService,
    private common: CommonService) {
  }

  ngOnInit() {
    this.getMyIndent();
  }

  getMyIndent() {
    this.common.presentLoading().then(preLoad => {
      this.httpIndent.getMyIndent(this.page, this.status).subscribe({
        next:(data) => {
          if (data.status) {
            this.indentView = [...this.indentView, ...data.data.data];
            this.page = this.page + 1;
          } else {
            this.common.presentToast(data.msg, 'warning');
          }
        },
        error:() => {
          this.common.dismissloading();
          this.common.presentToast(environment.errMsg, 'danger');
        },
        complete:() => {
          this.common.dismissloading();
        }
      });
    })
  }

  changeSegment(ev: any) {

    this.indentView = [];
    this.page = 1;
    this.getMyIndent();
  }

  infiniteScroll(ev: any) {
    ev.target.complete();
    this.getMyIndent();
  }

  myCustom(ev: any) {
    this.indentView = this.indentView.filter((val: any) => val.rqst_id !== ev.rqst_id);
  }

}
