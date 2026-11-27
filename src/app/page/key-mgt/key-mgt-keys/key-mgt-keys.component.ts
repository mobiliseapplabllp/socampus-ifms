import { Component, OnInit } from '@angular/core';
import { KeysService } from 'src/app/provider/keys/keys.service';
import { environment } from 'src/environments/environment';
import { CommonService } from 'src/app/provider/common/common.service';
import { NavigationEnd, Router } from '@angular/router';
import { RecoverLostComponent } from '../recover-lost/recover-lost.component';
import { ModalController } from '@ionic/angular';
import { ImageViewComponent } from 'src/app/shared/image-view/image-view.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-key-mgt-keys',
  templateUrl: './key-mgt-keys.component.html',
  styleUrls: ['./key-mgt-keys.component.scss'],
})
export class KeyMgtKeysComponent implements OnInit {
  status = 'assigned_key'
  selectedData: any;
  isModalOpen = false;
  isModalOpenLocationHistory = false;

  activeFilter: string = '';
  assignKeyData: any = []  
  addKeyData: any = []
  addKeyDataCopy: any = [];
  assignKeyDataCopy: any = [];
  locationHisArr: any = [];
  totalAss = 0;
  totalKey = 0
  page = 1;
  canLoadData = false;
  searchVal!: string;
  routerSub!: Subscription;
  constructor(
    private httpKey: KeysService,
    private httpCommon: CommonService,
    private router: Router,
    private modalCtrl: ModalController,
  ) { }

  ngOnInit() {
    this.routerSub = this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd && event.url.includes('/tabs/keys')) {        
        let status = this.httpKey.getHomePageStatus();                
        if (status) {
          this.canLoadData = false;            
          this.loadPage();         
          this.httpKey.setHomePageStatus(false); 
        }
      }
    });
  }

  ngOnDestroy() {
    if (this.routerSub) {
      this.routerSub.unsubscribe();
    }
  }

  loadPage() {
    const value = this.status;
    this.page = 1;    
    if (value === 'assigned_key') {      
      this.assignKeyData = [];
      this.getAssignedKeys('');
      return
    }
    if (value === 'add_key') {
      this.addKeyData = [];
      this.getAddKeys('');
      return;
    }    
  }

  ionViewDidEnter() {    
    
  }

  handleRefresh(event: any) {
    event.target.complete();     
    this.loadPage();
  }

  changeSegment(ev: any) {    
    this.loadPage()
  }

  openDetails(item: any) {       
    this.selectedData = item; 
    this.httpCommon.presentLoading().then(preLoad => {
      this.httpKey.viewKey(this.httpKey.asgnId(item)).subscribe({
        next:(data: any) => {          
          if (data.status) {     
            this.selectedData = data.data;                   
            this.isModalOpen = true;            
          } else {
            this.isModalOpen = true;            
          }
        },
        error:() => {
          this.httpCommon.dismissloading();
          this.httpCommon.presentToast(environment.errMsg, 'danger');
        },
        complete:() => {
          this.httpCommon.dismissloading();
        }
      });
    });    
  }

  closeModal() {
    this.isModalOpen = false;
  }

  closeModalLocationHis() {
    this.isModalOpenLocationHistory = false;
    this.locationHisArr = [];
  }

  async recoverLost(dat: any) {  
    const modal = await this.modalCtrl.create({
      component: RecoverLostComponent,
      cssClass: 'my-modal2',
      componentProps: {
        req_data: dat
      }
    });
    modal.onWillDismiss().then(async disModal => {
      if (disModal.role === 'true' ) {
        this.page = 1;
        this.assignKeyData = [];
        this.getAssignedKeys('');       
      }
    });

    modal.present();
  }


  assignKey(dat: any) {
    // (click)="openRoute('/key-mgt/assign-key')"
    this.router.navigate(['/key-mgt/assign-key'], {
      queryParams: {
        data: JSON.stringify(dat),
      }
    });
  }

  // Backend me search / pagination nahi hai, isliye list par local filter lagta hai
  search(ev: any) {
    const val = String(ev.target.value || '').toLowerCase();
    this.searchVal = val;
    const match = (row: any) => !val || JSON.stringify(row).toLowerCase().includes(val);
    if (this.status === 'assigned_key') {
      this.assignKeyData = this.assignKeyDataCopy.filter(match);
    } else {
      this.addKeyData = this.addKeyDataCopy.filter(match);
    }
  }

  getAssignedKeys(val: string, ev?: any) {    
    this.httpCommon.presentLoading().then(preLoad => {
      this.httpKey.getAssignKeys().subscribe({
        next: (res: any) => {
          if (res.status) {
            this.assignKeyDataCopy = res.data || [];
            this.assignKeyData = this.assignKeyDataCopy;
            this.totalAss = this.assignKeyDataCopy.length;
            this.canLoadData = false;
          } else {
            this.httpCommon.presentToast(res.msg || 'Data Not Found', 'warning');
          }          
        },
        error: (error: any) => {
          ev?.target?.complete();
          this.httpCommon.dismissloading();
          this.httpCommon.presentToast(environment.errMsg, 'danger');
        },
        complete: () => {
          ev?.target?.complete();
          this.httpCommon.dismissloading();
        }
      });
    })
  }

  infiniteScroll(ev: any) {
    this.getAssignedKeys(this.searchVal || '', ev);
  }

  getAddKeys(val: string, ev?: any) {    
    this.httpCommon.presentLoading().then(preLoad => {
      this.httpKey.getAddKeys().subscribe({
        next: (data: any) => {
          if (data.status) {
            this.addKeyDataCopy = data.data || [];
            this.addKeyData = this.addKeyDataCopy;
            this.totalKey = this.addKeyDataCopy.length;
            this.canLoadData = false;
          } else {
            this.httpCommon.presentToast(data.msg || 'Data not Found', 'warning');
          }          
        },
        error: (error: any) => {
          ev?.target?.complete();
          this.httpCommon.dismissloading();
          this.httpCommon.presentToast(environment.errMsg, 'danger');
        },
        complete: () => {
          ev?.target?.complete();
          this.httpCommon.dismissloading();
        }
      });
    })
  }

  infiniteScroll1(ev: any) {
    this.getAddKeys(this.searchVal || '', ev);
  }


  openLocationHis(dat: any) {    
    this.locationHisArr = [];
    this.isModalOpenLocationHistory = true;    
    this.getLocationHistory(dat.id);
  }

  getLocationHistory(keyId: number) {
    this.httpCommon.presentLoading().then(preLoad => {
      this.httpKey.getLocationHistory(keyId).subscribe({
        next:(data: any) => {          
          if (data.status) {
            this.locationHisArr = data.data || [];
          } else {
            this.httpCommon.presentToast(data.msg || 'Data Not Found', 'warning');
          }
        },
        error:() => {
          this.httpCommon.dismissloading();
        },
        complete:() => {
          this.httpCommon.dismissloading();
        }
      });
    });    
  }

  // openRoute(dat: any) {
  //   this.router.navigate(['key-mgt/lostkey-report'], {
  //     state: { keyData: dat }
  //   });
  // }

  history(dat: any) {
    this.router.navigate(['key-mgt/key-history'], {
      state: { keyData: dat }
    });    
  }
  // openRoute(dat:any){
  //   this.router.navigate(['key-mgt/lostkey-report'], {
  //     state: { keyData: dat }
  //   });
  // }

  // history(dat:any){
  //   this.router.navigate(['key-mgt/key-history'], {
  //     state: { keyData: dat }
  //   });
  // }

  openRoute(url: string, dat: any) {
    this.router.navigateByUrl(url, { state: { keyData: dat } });
  }

  editKey(dat: any): any {
    // this.router.navigateByUrl()
    this.router.navigate(['/key-mgt/add-key'], {
      queryParams: {
        data: JSON.stringify(dat),
      }
    });
  }

  viewPhoto(url: string) {
    this.httpCommon.openImg(url, '');
  }

  async imageView(base64: any) {
    const modal = await this.modalCtrl.create({
      component: ImageViewComponent,
      backdropDismiss: false,
      componentProps: {
        base64: base64,
        blob: null
      }
    });
    modal.onWillDismiss().then(disModal => {
  
    });
    return await modal.present();
  }
  

}
