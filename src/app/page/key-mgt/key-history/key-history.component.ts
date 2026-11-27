import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { KeysService } from 'src/app/provider/keys/keys.service';
import { CommonService } from 'src/app/provider/common/common.service';

@Component({
  selector: 'app-key-history',
  templateUrl: './key-history.component.html',
  styleUrls: ['./key-history.component.scss'],
})
export class KeyHistoryComponent implements OnInit {
  keyId: any;
  recent: any = [];
  req_data: any = [];
  constructor(
    private router: Router,
    private httpKey: KeysService,
    private httpCommon: CommonService
  ) { }

  ngOnInit() {
    const navigation = this.router.getCurrentNavigation();
    this.req_data = navigation?.extras?.state?.['keyData'];    
    if (this.req_data) {
      this.setData(this.req_data);      
    }
  }

  setData(data: any) {    
    this.keyId = data.key_id;
    if (this.keyId) {
      this.getAssignKeyHis();
    }
  }

  getAssignKeyHis() {
    this.httpCommon.presentLoading().then(preLoad => {
      this.httpKey.assignKeyHis(this.keyId).subscribe({
        next: (data: any) => {          
          this.recent = data?.data || [];
        },
        error: (error) => {          
          this.httpCommon.dismissloading();
          this.httpCommon.presentToast('Failed to load history', 'danger');
        },
        complete: () => {
          this.httpCommon.dismissloading();
        }
      });
    });
  }


}
