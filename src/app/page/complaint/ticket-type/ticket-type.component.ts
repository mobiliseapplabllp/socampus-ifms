import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LoadingController, ModalController, NavController, NavParams } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { ComplaintService } from 'src/app/provider/complaint/complaint.service';
import { environment } from 'src/environments/environment';
// import { IonModal } from '@ionic/angular';
import { AssignTicketComponent } from '../assign-ticket/assign-ticket.component';
import { HseAssignComponent } from '../hse-assign/hse-assign.component';
import { ActivatedRoute } from '@angular/router';
import { QueryCatComponent } from 'src/app/shared/query-cat/query-cat.component';
import { QuerySubCatComponent } from 'src/app/shared/query-sub-cat/query-sub-cat.component';
import { QuerySubCat2Component } from 'src/app/shared/query-sub-cat2/query-sub-cat2.component';
import { BuildingComponent } from 'src/app/shared/building/building.component';
import { FloorComponent } from 'src/app/shared/floor/floor.component';
import { LocationComponent } from 'src/app/shared/location/location.component';
import { BlockComponent } from 'src/app/shared/block/block.component';
@Component({
  selector: 'app-ticket-type',
  templateUrl: './ticket-type.component.html',
  styleUrls: ['./ticket-type.component.scss'],
})
export class TicketTypeComponent  implements OnInit {
  // @ViewChild(IonModal) modal!: IonModal;
  loading: any;
  public ticketForm!: FormGroup;
  barcodeList: any = [];
  requestData1: any = [];
  ticket: any;
  issueType: any = [];
  query: any = [];
  subCategory: any = [];
  subCategory2: any = [];
  requestedData: any = [];
  allData: any;
  ticketPriority: any = [];
  selectPriorityObj: any = {};
  requestType: any = [];
  buildingArr: any = [];
  floorArr: any = [];
  locationArr: any = [];
  isShowBuilding = false;
  locations: any = [];
  assignUserSelect: any = {};
  buddyUserSelect: any = {};
  pc_hse_conf: any = [];
  isAscending!: boolean;
  constructor(
    private formbuilder: FormBuilder,
    private httpComplaint: ComplaintService,
    private httpCommon: CommonService,
    private modalCtrl: ModalController,
    private loadingController: LoadingController,
    private activeRoute: ActivatedRoute,
    private navCtrl: NavController) {
  }

  ngOnInit() {
    this.initForm();
    this.activeRoute.queryParams.subscribe((res) => {
       this.requestedData = JSON.parse(res['data']);;
       this.ticketPriority = this.requestedData?.priority_list || [];
       this.allData = this.requestedData?.data || [];
       this.pc_hse_conf = this.requestedData.data?.pc_hse_conf || [];
       this.ticket = this.allData?.tkts_id;
       if (this.allData?.source !== 'QRCODE') {
         this.isShowBuilding = true;
       }
       console.log(this.allData);
       this.getRequestType(this.allData.tkts_issue_id);
    });
    // this.httpCommon.setHomeLoadStatus(true);
  }


  initForm() {
    this.ticketForm = this.formbuilder.group({
      issue_type: ['', Validators.required],
      req_type_id: [''],
      tkt_tag: [''],
      is_barcode: [''],
      barcode: [''],
      category: [''],
      category_desc: [''],
      block_id_desc: [''],
      block_id: [''],
      bldg_id: [''],
      bldg_id_desc: [''],
      floor_id: [''],
      floor_id_desc: [''],
      loc_code: [''],
      loc_code_desc: [''],
      subcat1_id: [''],
      subcat1_id_desc: [''],
      subcat2_id: [''],
      subcat2_id_desc: [''],
      barcode_id: [''],
      ticketId: [''],
      tkt_priority: ['', Validators.required],
      ptw_req: [''],
      ppe_kit_req: [''],
      assignToName: ['', Validators.required],
      assignTo: [''],
      buddy_req: [''],
      buddyId: [''],
      buddyName: ['']
    });
    setTimeout(() => {
      let tkt_tag = this.allData?.tkt_tag;
      if (tkt_tag) {
        tkt_tag = tkt_tag.toString();
      }
      this.ticketForm.get('ticketId')?.setValue(this.ticket);
      this.ticketForm.get('tkt_tag')?.setValue(tkt_tag);
      this.ticketForm.get('category_desc')?.setValue(this.allData.cat_desc);
      this.ticketForm.get('category')?.setValue(this.allData.cat_id);
      this.ticketForm.get('subcat1_id_desc')?.setValue(this.allData.subcat1_desc);
      this.ticketForm.get('subcat1_id')?.setValue(this.allData.subcat1_id);
      this.ticketForm.get('subcat2_id_desc')?.setValue(this.allData.subcat2_desc);
      this.ticketForm.get('subcat2_id')?.setValue(this.allData.subcat2_id);

      this.ticketForm.get('block_id_desc')?.setValue(this.allData.block_desc);
      this.ticketForm.get('block_id')?.setValue(this.allData.block_id);

      this.ticketForm.get('bldg_id')?.setValue(this.allData.building_id);
      this.ticketForm.get('bldg_id_desc')?.setValue(this.allData.building_desc);

      this.ticketForm.get('floor_id')?.setValue(this.allData.floor_id);
      this.ticketForm.get('floor_id_desc')?.setValue(this.allData.floor_desc);
      this.ticketForm.get('loc_code')?.setValue(this.allData.loc_id);
      this.ticketForm.get('loc_code_desc')?.setValue(this.allData.location_desc);

    });
    this.getIssueType();
  }

  getRequestType(id: any) {
    this.httpComplaint.getRequestType(id).subscribe({
      next:(data) => {
        if (data.status) {
        this.requestType = data.data;
          setTimeout(() => {
            this.ticketForm.get('req_type_id')?.setValue(this.allData.req_type_id);
          }, 100);
        } else {
          this.httpCommon.presentToast(data.msg, 'danger');
        }
      },
      error:() => {
        this.httpCommon.presentToast(environment.errMsg, 'danger');
      },
      complete:() => {

      }
    });
  }


  changeRadio() {
    // this.ticketForm.get('bldg_id')?.setValue('');
    // this.ticketForm.get('floor_id')?.setValue('');
    // this.ticketForm.get('loc_code')?.setValue('');
    this.isShowBuilding = false
  }



  changeIsBarcode(ev: any) {
    // this.ticketForm.get('barcode')?.setValue('');
    // this.ticketForm.get('barcode_id')?.setValue('');
    // this.barcodeList = [];
    if (ev.target.value == 0) {
      this.isShowBuilding = true;
      // setTimeout(() => {
      //   if (this.locations.length > 0) {
      //     this.ticketForm.get('bldg_id')?.setValue(this.allData.building_id)
      //   }
      // }, 100);
    }
  }

  getBuilding(id: any) {
    this.httpComplaint.getBuildingList(id).subscribe({
      next:(data) => {
        if (data.status) {
          this.buildingArr = data.data;
          // if (this.locations.length > 0) {
          // }
          setTimeout(() => {
            this.ticketForm.get('bldg_id')?.setValue(this.allData.building_id)
          }, 100);
        } else {
          this.httpCommon.presentToast(data.msg, 'warning');
        }
      },
      error:() => {
        this.httpCommon.presentToast(environment.errMsg, 'danger');
      },
      complete:() => {
      }
    })
  }

  changeBuilding(ev: any) {
    let id = ev.target.value;
    if(!id) {
      return;
    }
    this.dismissloading();
    this.getFloorList(id)
  }

  getFloorList(id: any) {
    this.presentLoading().then(preLoad => {
      this.httpComplaint.getFloorList(id).subscribe({
        next:(data) => {
          if (data.status) {
            this.floorArr = data.data;
            // if (this.locations.length > 0) {
            // }
            setTimeout(() => {
              this.ticketForm.get('floor_id')?.setValue(this.allData.floor_id);
            }, 100);
          } else {
            this.httpCommon.presentToast(data.msg , 'warning');
          }
        },
        error:() => {
          this.dismissloading();
          this.httpCommon.presentToast(environment.errMsg, 'danger');
        },
        complete:() => {
          this.dismissloading();
        }
      })
    })
  }

  changeFloor(ev: any) {
    let id = ev.target.value;
    if (!id) {
      return;
    }
    this.dismissloading();
    this.getLocation(id);
  }

  getLocation(id: any) {
    this.presentLoading().then(preLoad => {
      this.httpComplaint.getLocationList(id).subscribe({
        next:(data) => {
          if (data.status) {
            this.locationArr = data.data;
            setTimeout(() => {
              // if (this.locations.length > 0) {
              // }
              this.ticketForm.get('loc_code')?.setValue(this.allData.loc_id)
            }, 100)
          } else {
            this.httpCommon.presentToast(data.msg, 'warning');
          }
        },
        error:() => {
          this.dismissloading();
          this.httpCommon.presentToast(environment.errMsg, 'danger');
        },
        complete:() => {
          this.dismissloading();
        }
      })
    })
  }

  changeType() {
    return;
    this.ticketForm.get('is_barcode')?.setValue('');
    this.ticketForm.get('barcode')?.setValue('');
    this.ticketForm.get('category')?.setValue('');
    this.ticketForm.get('subcat1_id')?.setValue('');
    this.ticketForm.get('subcat2_id')?.setValue('');
    this.barcodeList = [];
    if (this.ticketForm.value.issue_type == 2) {
      // this.getQueryCat();
      // this.query = this.allData.cateList;
      setTimeout(() => {
        this.ticketForm.get('category')?.setValue(this.allData.cat_id);
      }, 100)
    }
  }

  getIssueType() {
    this.presentLoading().then(preLoad => {
      this.httpComplaint.getIssueType().subscribe(data => {
        this.dismissloading();
        if (data.status) {
          this.issueType = data.data;
          if (this.allData.issue_desc === 'Service') {
            setTimeout(() => {
              this.ticketForm.get('issue_type')?.setValue(2);
            }, 100)
          } else if (this.allData.issue_desc === 'Assets') {
            setTimeout(() => {
              this.ticketForm.get('issue_type')?.setValue(1);
              if (!this.allData.ext_asset_id) {
                this.ticketForm.get('is_barcode')?.setValue('0');
              } else {
                this.ticketForm.get('is_barcode')?.setValue('1');
                this.ticketForm.get('barcode')?.setValue(this.allData.ext_asset_id);
                this.searchClientId();
              }
            }, 100)
          }
        }
      });
    })
  }

  // getQueryCat() {
  //   this.presentLoading().then(preLoad => {
  //     this.httpComplaint.getQueryCategory(this.ticketForm.value.issue_type).subscribe({
  //       next:(data) => {
  //         if (data.status) {
  //           this.query = data.data;
  //           setTimeout(() => {
  //             this.ticketForm.get('category')?.setValue(this.allData.cat_id);
  //           }, 100)
  //         }
  //       },
  //       error:() => {
  //         this.dismissloading();
  //         this.httpCommon.presentToast(environment.errMsg, 'danger');
  //       },
  //       complete:() => {
  //         this.dismissloading();
  //       }
  //     });
  //   })
  // }

  async openCategory() {
    const modal = await this.modalCtrl.create({
      component: QueryCatComponent,
      cssClass: 'my-modal',
      componentProps : {
        issue_id: this.ticketForm.value.issue_id,
        pc_id: this.ticketForm.value.pc_id,
        data: this.allData.cateList
      }
    });
    modal.onWillDismiss().then(disModal => {
      if (disModal.role) {
        this.ticketForm.get('category_desc')?.setValue(disModal.data.label);
        this.ticketForm.get('category')?.setValue(disModal.data.value);
        this.ticketForm.get('subcat1_id')?.setValue('');
        this.ticketForm.get('subcat1_id_desc')?.setValue('');
        this.ticketForm.get('subcat2_id')?.setValue('');
        this.ticketForm.get('subcat2_id_desc')?.setValue('');
        this.subCategory = [];
        this.subCategory2 = [];
        this.changeQuery(disModal.data.value);
      }
    });
    return await modal.present();
  }

  changeQuery(id: any) {
    this.presentLoading().then(preLoad => {
      this.httpComplaint.getQuerySubCat1(id).subscribe({
        next:(data) => {
          if (data.status) {
            this.subCategory = data.data;
          }
        },
        error:() => {
          this.dismissloading();
          this.httpCommon.presentToast(environment.errMsg, 'danger');
        },
        complete:() => {
          this.dismissloading();
        }
      });
    })
  }

  async openCategorySubCat() {
    if(!this.ticketForm.value.category) {
      alert('Please Select Category');
      return;
    }
    const modal = await this.modalCtrl.create({
      component: QuerySubCatComponent,
      cssClass: 'my-modal',
      componentProps : {
        qry_id: this.ticketForm.value.category,
        allData: this.subCategory
      }
    });
    modal.onWillDismiss().then(disModal => {
      if (disModal.role) {
        this.ticketForm.get('subcat1_id_desc')?.setValue(disModal.data.label);
        this.ticketForm.get('subcat1_id')?.setValue(disModal.data.value);
        this.ticketForm.get('subcat2_id_desc')?.setValue('');
        this.ticketForm.get('subcat2_id')?.setValue('');
        this.subCategory2 = [];
        this.changeSubCat(disModal.data.value);
      }
    });
    return await modal.present();
  }

  changeSubCat(id: any) {
    this.presentLoading().then(preLoad => {
      this.httpComplaint.getQuerySubCat2(id).subscribe({
        next:(data) => {
          if (data.status) {
            this.subCategory2 = data.data;
          }
        },
        error:() => {
          this.dismissloading();
        },
        complete:() => {
          this.dismissloading();
        }
      });
    })
  }

  async openCategorySubCat2() {
    if(!this.ticketForm.value.subcat1_id) {
      alert('Please Select Category 1');
      return;
    }
    const modal = await this.modalCtrl.create({
      component: QuerySubCat2Component,
      cssClass: 'my-modal',
      componentProps : {
        qry_id1: this.ticketForm.value.subcat1_id,
        allData:  this.subCategory2
      }
    });
    modal.onWillDismiss().then(disModal => {
      if (disModal.role) {
        this.ticketForm.get('subcat2_id_desc')?.setValue(disModal.data.label);
        this.ticketForm.get('subcat2_id')?.setValue(disModal.data.value);
      }
    });
    return await modal.present();
  }

  async openBlock() {
    if (!this.allData.pc_id) {
      this.httpCommon.presentToast('PC Id is Missing', 'warning');
      return;
    }
    const modal = await this.modalCtrl.create({
      component: BlockComponent,
      cssClass: 'my-modal',
      componentProps : {
        allData: this.allData
      }
    });
    modal.onWillDismiss().then(disModal => {
      if (disModal.role) {
        this.ticketForm.get('block_id_desc')?.setValue(disModal.data.label);
        this.ticketForm.get('block_id')?.setValue(disModal.data.value);
        this.ticketForm.get('bldg_id_desc')?.setValue('');
        this.ticketForm.get('bldg_id')?.setValue('');
        this.ticketForm.get('floor_id_desc')?.setValue('');
        this.ticketForm.get('floor_id')?.setValue('');
        this.ticketForm.get('loc_code_desc')?.setValue('');
        this.ticketForm.get('loc_code')?.setValue('');
      }
    });
    return await modal.present();
  }

  async openBuilding() {
    console.log(this.ticketForm.value);
    if (!this.ticketForm.value.block_id) {
      this.httpCommon.presentToast('Block Id is Missing', 'warning');
      return;
    }
    const modal = await this.modalCtrl.create({
      component: BuildingComponent,
      cssClass: 'my-modal',
      componentProps : {
        id: this.ticketForm.value.block_id
      }
    });
    modal.onWillDismiss().then(disModal => {
      if (disModal.role) {
        this.ticketForm.get('bldg_id_desc')?.setValue(disModal.data.label);
        this.ticketForm.get('bldg_id')?.setValue(disModal.data.value);
        this.ticketForm.get('floor_id_desc')?.setValue('');
        this.ticketForm.get('floor_id')?.setValue('');
        this.ticketForm.get('loc_code_desc')?.setValue('');
        this.ticketForm.get('loc_code')?.setValue('');
      }
    });
    return await modal.present();
  }

  async openFloorModal() {
    if (!this.ticketForm.value.bldg_id) {
      this.httpCommon.presentToast('Please Select Building', 'warning');
      return;
    }
    const modal = await this.modalCtrl.create({
      component: FloorComponent,
      cssClass: 'my-modal',
      componentProps : {
        bldg_id: this.ticketForm.value.bldg_id
      }
    });
    modal.onWillDismiss().then(disModal => {
      if (disModal.role) {
        this.ticketForm.get('floor_id_desc')?.setValue(disModal.data.label);
        this.ticketForm.get('floor_id')?.setValue(disModal.data.value);
        this.ticketForm.get('loc_code_desc')?.setValue('');
        this.ticketForm.get('loc_code')?.setValue('');
        // this.createForm.get('loc_id')?.setValue('');
        // this.createForm.get('loc_id_desc')?.setValue('')
      }
    });
    return await modal.present();
  }

  async openLocationModal() {
    if (!this.ticketForm.value.floor_id) {
      this.httpCommon.presentToast('Please Select Floor', 'warning');
      return;
    }
    const modal = await this.modalCtrl.create({
      component: LocationComponent,
      cssClass: 'my-modal',
      componentProps : {
        floor_id: this.ticketForm.value.floor_id
      }
    });
    modal.onWillDismiss().then(disModal => {
      if (disModal.role) {
        this.ticketForm.get('loc_code_desc')?.setValue(disModal.data.label);
        this.ticketForm.get('loc_code')?.setValue(disModal.data.value);
      }

    });
    return await modal.present();
  }

  searchClientId() {
    this.presentLoading().then(preLoad => {
      this.httpComplaint.getClientIdBarcode(this.ticketForm.value.barcode).subscribe({
        next:(data) => {
          if (data.status === false) {
            this.httpCommon.presentToast(data.msg, 'warning');
          } else {
            this.barcodeList = data.data;
            if (this.allData.ext_asset_id) {
              let obj, asset_id;
              obj = this.barcodeList.filter((val: any) => val.ext_asset_id === this.allData.ext_asset_id);
              if (obj.length > 0) {
                asset_id = obj[0].asset_id;
                this.ticketForm.get('barcode_id')?.setValue(asset_id);
              }
            }
          }
        },
        error:() => {
          this.dismissloading();
          this.httpCommon.presentToast(environment.errMsg, 'danger');
        },
        complete:() => {
          this.dismissloading();
        }
      });
    });
  }
  dismiss(data: any, status: any) {
    this.modalCtrl.dismiss(data, status);
  }

  saveData() {
    if (this.pc_hse_conf.ptw_allow == 1 && !this.ticketForm.value.ptw_req) {
      this.httpCommon.presentToast('Please Select PTW Required', 'warning');
    } else if (this.pc_hse_conf.ppekit_allow == 1 && !this.ticketForm.value.ppe_kit_req) {
      this.httpCommon.presentToast('Please Select PPE Kit', 'warning');
    } else if (this.pc_hse_conf.buddy_allow == 1 && !this.ticketForm.value.buddy_req) {
      this.httpCommon.presentToast('Please Select Buddy', 'warning');
    } else if (this.ticketForm.value.buddy_req == '1' && !this.ticketForm.value.buddyName) {
      this.httpCommon.presentToast('Please Select Buddy Name', 'warning');
    } else {
      this.presentLoading().then(preLoad => {
        this.httpComplaint.complaintTypeConfirm(this.ticketForm.value).subscribe({
          next:(data) => {
            if (data.status) {
              this.httpCommon.presentToast(data.msg, 'success');
              this.httpCommon.setHomeLoadStatus(true);
              this.navCtrl.pop();
              // this.dismiss(data, true);
            } else {
              this.httpCommon.presentToast(data.msg, 'warning');
            }
          },
          error:() => {
            this.dismissloading();
            this.httpCommon.presentToast(environment.errMsg, 'danger');
          },
          complete:() => {
            this.dismissloading();
          }
        });
      })
    }
  }

  // getPriority() {
  //   this.httpComplaint.getTicketPriority(this.requestedData.data.tkts_id).subscribe({
  //     next:(data) => {
  //       if (data.status) {
  //         // this.ticketPriority = data.data;
  //       }
  //     },
  //     error:() => {
  //       this.httpCommon.presentToast(environment.errMsg, 'danger');
  //     },
  //     complete:() => {

  //     }
  //   })
  // }

  changePriority(ev: any) {
    this.selectPriorityObj = this.ticketPriority.filter((val: any) => val.id == ev.target.value)[0];
  }

  verify() { }

  async presentLoading() {
    this.dismissloading();
    this.loading = await this.loadingController.create({
      cssClass: 'my-custom-class',
      message: 'Please wait...',
      duration: 8000
    });
    await this.loading.present();
  }

  async dismissloading() {
    if (this.loading) {
      this.loading.dismiss();
    }
  }

  async assignTicket() {
    const modal = await this.modalCtrl.create({
      component: AssignTicketComponent,
      componentProps: {
        ticket_id: this.ticket,
        allData: this.allData
      }
    });
    modal.onWillDismiss().then(async disModal => {
      if (disModal.role) {
        // this.greetEvent.emit(true);
      }
    });
    modal.present();
  }

  async hseAssign(val: string) {
    if (val === 'buddy' && !this.assignUserSelect.value) {
      this.httpCommon.presentToast('Please Select Assign To User First', 'warning');
      return
    }
    const modal = await this.modalCtrl.create({
      component: HseAssignComponent,
      componentProps: {
        allData: this.allData,
        pc_hse_conf: this.pc_hse_conf,
        val: val,
        assignTo: this.assignUserSelect.value
      }
    });
    modal.onWillDismiss().then(async disModal => {
      if (disModal.role) {
        if (val === 'assign') {
          this.assignUserSelect = disModal.data;
          this.ticketForm.get('assignToName')?.setValue(this.assignUserSelect.label);
          this.ticketForm.get('assignTo')?.setValue(this.assignUserSelect.value + '-' + this.assignUserSelect.team_id);
          this.buddyUserSelect = [];
          this.ticketForm.get('buddyName')?.setValue('');
          this.ticketForm.get('buddyId')?.setValue('');
        } else if (val === 'buddy') {
          this.buddyUserSelect = disModal.data
          this.ticketForm.get('buddyName')?.setValue(this.buddyUserSelect.label);
          this.ticketForm.get('buddyId')?.setValue(this.buddyUserSelect.value + '-' + this.buddyUserSelect.team_id);
        }
      }
    });
    modal.present();
  }
}
