import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController, ModalController, Platform, ToastController, IonDatetime, IonSlides } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { ListMasterService } from 'src/app/provider/list-master/list-master.service';
import { LoginService } from 'src/app/provider/login/login.service';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { SpeechRecognition } from "@capacitor-community/speech-recognition";
import Chart from 'chart.js/auto';
import { environment } from 'src/environments/environment';
import { ComplaintService } from 'src/app/provider/complaint/complaint.service';
import { DigitalChecklistService } from 'src/app/provider/digital-checklist/digital-checklist.service';
import * as moment from 'moment';
import { PmCalService } from 'src/app/provider/pm-cal/pm-cal.service';
import { PmAssignComponent } from '../pm-cal/pm-assign/pm-assign.component';
import { MeterService } from 'src/app/provider/meter/meter.service';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { TicketTypeComponent } from '../complaint/ticket-type/ticket-type.component';
import { AssignTicketComponent } from '../complaint/assign-ticket/assign-ticket.component';
import { SiteDetailComponent } from '../complaint/site-detail/site-detail.component';
import { TicketHistoryComponent } from '../complaint/ticket-history/ticket-history.component';
@Component({
  selector: 'app-list-master',
  templateUrl: './list-master.page.html',
  styleUrls: ['./list-master.page.scss'],
})
export class ListMasterPage implements OnInit {
  @ViewChild('popoverDatetime')  popoverDatetime!: IonDatetime;
  @ViewChild('mySlider', { static: true }) slides!: IonSlides;
  @ViewChild('canvas') canvas!: ElementRef;

  myMenu: any = [];
  menuTemp: any = [];
  menuNew: any = [];
  loading: any;
  subscription: any;
  counter = 0;
  mySlide: any = [
    {id: 'a' , img : '/assets/home_banner1/p1.jpg'},
    {id: 'a' , img : '/assets/home_banner1/p2.jpg'},
    {id: 'a' , img : '/assets/home_banner1/p3.jpg'},
  ];
  userData: any = [];
  result: any = [];
  userName!: string;
  breakdown = '';
  pms = '';
  indent = '';
  option = {
    slidesPerView:1.5,
    centeredSlides:true,
    loop: true,
    spaceBetween: 5,
    breakpoints: {
      320: {
        slidesPerView: 1.5,
      },
      480: {
        slidesPerView: 1.6,
      },
      530: {
        slidesPerView: 1.7,
      },
      640: {
        slidesPerView: 1.8,
      },
      700: {
        slidesPerView: 1.9,
      },
    }
   }
  menuSlide = {
    initialSlide: 0,
    slidesPerView: 3.8,
    autoplay: false,
    spaceBetween: 0,
    breakpoints: {
      320: {
        slidesPerView: 3.8,
      },
      480: {
        slidesPerView: 3.3,
      },
      530: {
        slidesPerView: 3.5,
      },
      640: {
        slidesPerView: 3.9,
      },
      700: {
        slidesPerView: 4.1,
      },
    }
  }
  isInternet!: boolean;
  bars: any;
  title = 'ng-chart';
  chart: any = [];
  circleVal: any;
  circleData = 95;
  circleDashboard: any = [{
    desc: 'Checklist',
    color: '#FE9004',
    per: 95
  },{
    desc: 'Preventive',
    color: '#0472FE',
    per: 50
  },{
    desc: 'Reading',
    color: '#01A208',
    per: 80
  }]
  cat_id = 1;

  category = [{
    label: 'Digital',
    id: 1
  },{
    label: 'PMS',
    id: 2
  },{
    label: 'Meter',
    id: 3
  }];
  digitalCat = [{
    label: 'Hard',
    id:1
  },{
    label: 'Soft',
    id:2
  }];
  meterCat = [{
    label: 'Consumption',
    id: 1,
  },{
    label: 'Generation',
    id: 2,
  }];
  subCat = this.digitalCat;
  sub_cat_id = 1;
  res: any = [20, 10, 40, 35, 32, 50, 44];
  total: any = [20, 10, 30, 35, 32, 50, 44];
  // res: any = [];
  // total: any = [];
  check1 = true;
  stackedChart: any;
  pendingTask = true;
  segments = 'helpdesk';

  pendingTicket: any = [];
  allChecklist: any = [];
  assignCheckList: any = [];
  attendedCheckList: any = [];
  pmsList: any = [];
  meterInfo: any = [];
  formData = new FormData();

  constructor(
    private listMaster: ListMasterService,
    private toastController: ToastController,
    private loginPro: LoginService,
    private loadingController: LoadingController,
    private common: CommonService,
    private router: Router,
    private platform: Platform,
    private httpCompalint: ComplaintService,
    private httpDigital: DigitalChecklistService,
    private httpPm: PmCalService,
    private modalCtrl: ModalController,
    private httpMeter: MeterService
  ) {
    const user = localStorage.getItem('user');
    if (user) {
      this.userData = JSON.parse(user);
      this.userName = this.userData.user_name
    }
  }

  ngOnInit() {
    this.common.checkInternet().then(res => {
      if (res) {
        this.isInternet = true;
        this.common.setBarcode('');
        this.userData = this.loginPro.getLoginUserValue();
        this.getMenuDetail();
        this.getDashboard();
        this.getPendingTicket();
      } else {
        let menu, MENU_TEMP = localStorage.getItem('home_menu');
        if (MENU_TEMP) {
          this.myMenu = JSON.parse(MENU_TEMP);
          this.chunkedArray(this.myMenu)
          this.isInternet = false;
          console.log(menu);
        } else {
          this.common.presentToastWithOk('Menu Icon Not Saved in your Local DB, please connect with internet to save menu in Local DB', 'warning');
        }
      }
    });
  }

  ionViewDidEnter() {
    console.log(this.segments);
    if (this.segments === 'helpdesk') {
      this.getPendingTicket();
    } else if (this.segments === 'digital') {
      this.getSchedule(moment().format('YYYY-MM-DD'));
    } else if (this.segments === 'pms') {
      this.getPendingPms();
    } else if (this.segments === 'meter') {
      this.getPendingMeter();
    }
  }



  changePendingTask() {
    this.presentLoading().then(preLoad => {
      this.pendingTask = !this.pendingTask;
      if (this.pendingTask) {
        this.stackedChart = null;
      } else {
        setTimeout(() => {
          this.stackedBarChart();
          this.lineBarChart();
        }, 10);
      }
      this.dismissloading();
    })

  }

  getCircleValue() {
    for (var i = 0 ; i < this.circleDashboard.length;i++) {
      let val = this.circleDashboard[i].per;
      this.circleDashboard[i].newval = 722 - this.circleDashboard[i].per * 7.22;
    }
    console.log(this.circleDashboard);
  }

  getDashboard() {
    this.listMaster.getDashboard().subscribe(data => {
      console.log(data);
      if (data.status) {
        this.breakdown =  data.data.breakdown.assign.toString();
        this.pms = data.data.pms.assign.toString();
        this.indent = data.data.indent.assign.toString();
      }
    });
  }

  getPendingTicket() {
    this.httpCompalint.getPendingTicketHomePage(60).subscribe({
      next:(data: any) => {
        if (data.status) {
          this.pendingTicket = data.data.data;
        } else {
          this.common.presentToast(data.msg, 'warning');
        }
      },
      error:() => {
        this.dismissloading();
        this.common.presentToast(environment.errMsg, 'warning');
      },
      complete:() => {
        this.dismissloading();
      }
    });
  }

  async work_now(allData: any) {
    this.presentLoading().then(preLoad => {
      this.httpCompalint.checkTicketConfirm(allData.tkts_id).subscribe({
        next:(data) => {
          if (data.status) {
            this.openTicketWork(allData);
          } else {
            this.openTicketTypeModal(allData, data.locations, data.data);
          }
        },
        error:() => {
          this.dismissloading();
          this.common.presentToast(environment.errMsg, 'danger');
        },
        complete:() => {
          this.dismissloading();
        }
      });
    });
  }

  openTicketWork(data: any) {
    this.router.navigate(['complaint/ticket-work'], {
      queryParams: {
        data: JSON.stringify(data),
      }
    });
  }

  async openTicketTypeModal(allData: any, locations: any, data: any) {
    console.log(data);
    const modal = await this.modalCtrl.create({
      component: TicketTypeComponent,
      cssClass: 'my-modal',
      componentProps: { allData:  allData, locations: locations, requestData1: data }
    });
    modal.onWillDismiss().then(disModal => {
      console.log(disModal);
      if (disModal.role) {
        // this.greetEvent.emit(true);
      }
    });
    modal.present();
  }

  async openSite(data:any) {
    console.log('my site');
    const modal = await this.modalCtrl.create({
      component: SiteDetailComponent,
      cssClass: 'my-modal2',
      componentProps: { ticketData: data }
    });
    modal.present();
  }

  async history(tkts_id: any) {
    const modal = await this.modalCtrl.create({
      component: TicketHistoryComponent,
      cssClass: 'my-modal',
      componentProps: { ticket_id: tkts_id }
    });
    modal.present();
  }

  fsr(ticket_id: number) {}

  async assignTicket(ticket_id: any,  data: any) {
    const modal = await this.modalCtrl.create({
      component: AssignTicketComponent,
      cssClass: 'my-modal',
      componentProps: {
        ticket_id: ticket_id,
        allData: data
      }
    });
    modal.onWillDismiss().then(async disModal => {
      console.log(disModal);
      if (disModal.role) {
        this.getPendingTicket();
      }
    });
    modal.present();
  }

  clickCustomSegment(val: string) {
    this.segments = val;
    if (val === 'helpesk' && this.pendingTicket.length === 0) {
      this.getPendingTicket();
    } else if (val === 'digital' && this.assignCheckList.length === 0) {
      this.getSchedule(moment().format('YYYY-MM-DD'));
    } else if (val === 'pms' && this.pmsList.length === 0) {
      this.getPendingPms();
    } else if (val === 'meter' && this.meterInfo.length === 0) {
      this.getPendingMeter();
    }
  }

  changeSegmentHeaders(ev: any) {
    console.log(ev.target.value);
    if (ev.target.value === 'digital' && this.assignCheckList.length === 0) {
      this.getSchedule(moment().format('YYYY-MM-DD'));
    } else if (ev.target.value === 'pms' && this.pmsList.length === 0) {
      this.getPendingPms();
    } else if (ev.target.value === 'meter' && this.meterInfo.length === 0) {
      this.getPendingMeter();
    }
  }

  getSchedule(date: any) {
    this.allChecklist = [];
    this.assignCheckList = [];
    this.attendedCheckList = [];
    this.presentLoading().then(preLoad => {
      this.httpDigital.getScheduleHistory(date).subscribe({
        next:(data) => {
          console.log(data);
          if (data.status) {
            this.allChecklist = data.data;
            this.assignCheckList = this.allChecklist.filter((val: any) => val.schedule_status == 'assigned');
            this.attendedCheckList = this.allChecklist.filter((val: any) => val.schedule_status == 'attended');
          } else {
            this.common.presentToast(data.msg, 'warning');
          }
        },
        error:() => {
          this.dismissloading();
          this.common.presentToast(environment.errMsg, 'danger')
        },
        complete:() => {
          this.dismissloading();
        }
      })
    })
  }

  openFillReport(data: any) {
    this.router.navigateByUrl('/digital-checklist/fill-report/' + data.schedule_id + '/' + 0);
    return;
    if (this.platform.is('capacitor')) {
      if (!data.barcode  || data.schedule_status === 'attended') {
        this.router.navigateByUrl('/digital-checklist/fill-report/' + data.schedule_id + '/' + 0);
      }
      // else {
      //   this.qrType = data.schedule_id;
      //   this.router.navigateByUrl('/barcode');
      // }
    } else {
      this.router.navigateByUrl('/digital-checklist/fill-report/' + data.schedule_id + '/' + 0);
    }
  }

  getPendingPms(){
    this.presentLoading().then(() => {
      this.httpPm.getPm(1, 1).subscribe({
        next:(dat) => {
          if (dat.status) {
            this.pmsList = dat.data.data;
            this.pmsList = this.pmsList.filter((val: any) => val.stage_id === 1);
          } else {
            this.pmsList = [];
            this.common.presentToast(dat.msg, 'warning');
          }
        },
        error:() => {
          this.dismissloading();
          this.common.presentToast(environment.errMsg, 'warning');
        },
        complete:() => {
          this.dismissloading();
        }
      });
    });
  }

  uploadPtw(dat: any) {}

  async pmAssign(dat: any) {
    const modal = await this.modalCtrl.create({
      component: PmAssignComponent,
      cssClass: 'my-modal',
      componentProps: { data: dat }
    });
    modal.onWillDismiss().then(disModal => {
      if (disModal.role) {
        console.log('ff');
        this.pmsList = this.pmsList.filter((val:any) => val.wo_id !== dat.wo_id);
      }
    });
    modal.present();
  }

  viewAttachment(url: string) {
    this.common.openDoc(url);
  }

  openFillReportPms(dat: any) {
    this.router.navigate(['/pm-calibration/pm-report'], {
      queryParams: {
        data: JSON.stringify(dat),
      }
    });
  }

  getPendingMeter() {
    this.presentLoading().then(preLoad => {
      this.httpMeter.getPendingWo().subscribe({
        next:(data) => {
          if (data.status) {
            this.meterInfo = data.data;
          } else {
            this.common.presentToast(data.info, 'warning');
          }
        },
        error:() => {
          this.dismissloading();
          this.common.presentToast(environment.errMsg, 'danger');
        },
        complete:() => {
          this.dismissloading();
        }
      });
    })
  }

  checkPhotoCondition(dat: any, type: any) {
    if (dat.is_gllry_upld_allwd == 1) {
      this.presentActionSheet(1, dat , type);
    } else if (dat.is_gllry_upld_allwd == 0) {
      this.presentActionSheet(0, dat , type);
    } else {
      alert('Gallery is Undefined ' + dat.is_gllry_upld_allwd);
    }
  }

  async presentActionSheet(val: any, data: any, type: any) {
    const takePicture = async () => {
      var obj: any = {};
      if (val === 1) {
        obj = {
          quality: 80,
          allowEditing: false,
          resultType: CameraResultType.Uri,
        }
      } else {
        obj = {
          quality: 80,
          allowEditing: false,
          source: CameraSource.Camera,
          resultType: CameraResultType.Uri,
        }
      }
      const image = await Camera.getPhoto(obj);
      this.readImg(image, data ,type)
    };
    takePicture();
  }

  async readImg(photo: any, data: any,type: any) {
    let random = Date.now() + Math.floor(Math.random() * 90000) + 10000 + '.jpg'
    const response = await fetch(photo.webPath);
    const blob = await response.blob();
    if (type == 'consumption') {
        this.formData.delete('img1');
        this.formData.append('img1', blob, random);
        data.isConsumptionImg = true;
        for (var i = 0; i < this.meterInfo.length;i++) {
          if (data.wo_id !== this.meterInfo[i].wo_id) {
            this.meterInfo[i].isConsumptionImg = false;
          }
        }
      } else if (type == 'generate_reading') {
        this.formData.delete('img2');
        this.formData.append('img2', blob, random);
        data.isGenerationImg = true;
        for (var i = 0; i < this.meterInfo.length;i++) {
          if (data.wo_id !== this.meterInfo[i].wo_id) {
            this.meterInfo[i].isGenerationImg = false;
          }
        }
      }
      this.presentLoading().then(preLoad => {
        setTimeout(() => {
          this.dismissloading();
        }, 500)
      })
  }

  updateReading(dat: any, type: any) {
    if (type === 'consumption' ) {
      if (this.checkConsumptionCondition(dat)) {
        const obj = {
          wo_id: dat.wo_id,
          consume_reading: dat.consumption_reading,
        }
        this.save(obj, dat);
      }
    } else if (type === 'generation') {
      if (this.checkGenertionCondition(dat)) {
        const obj = {
          wo_id: dat.wo_id,
          gen_reading: dat.generate_reading
        }
        this.save(obj, dat);
      }
    } else if (type === 'both') {
      if (this.checkConsumptionCondition(dat) && this.checkGenertionCondition(dat) && this.checkOtherCondition(dat)) {
        const obj = {
          wo_id: dat.wo_id,
          consume_reading: dat.consumption_reading,
          gen_reading: dat.generate_reading,
          new_oth_reading: dat.other_reading
        }
        this.save(obj, dat);
      }
    }
  }

  checkConsumptionCondition(dat: any) {
    if (!dat.consumption_reading) {
      alert('Please Enter Consumption Reading');
      return false;
    } else if (dat.is_img_req == 1 && !dat.isConsumptionImg) {
      alert('Consumption Image is Required');
      return false;
    } else {
      return true;
    }
  }

  checkGenertionCondition(dat: any) {
    if (!dat.generate_reading) {
      alert('Please Enter Generate Reading');
      return false;
    } else if (dat.is_img_req == 1 && !dat.isGenerationImg) {
      alert('Generation Image is Required');
      return false;
    } else {
      return true;
    }
  }

  checkOtherCondition(dat: any) {
    if (!dat.other_reading && dat.oth_read == 1) {
      alert('Other Reading is Required');
      return false;
    } else {
      return true;
    }
  }

  save(obj: any, dat: any) {
    for (let key in obj) {
      this.formData.delete(key);
      this.formData.append(key, obj[key]);
    }
    this.presentLoading().then(preLoad => {
      this.httpMeter.updateReading(this.formData).subscribe({
        next:(data) => {
          if (data.status) {
            this.common.presentToast(data.msg, 'success');
            dat.isRemove = true
            setTimeout(() => {
              this.meterInfo = this.meterInfo.filter((val: any) => val.wo_id !== obj.wo_id);
            }, 500);
          } else {
            this.common.presentToast(data.msg, 'warning');
          }
        },
        error:() => {
          this.common.presentToast(environment.errMsg, 'danger');
          this.dismissloading();
        },
        complete:() => {
          this.dismissloading();
        }
      });
    })
  }


  speak() {
    const speak = async () => {
      await TextToSpeech.speak({
        text: 'This is a sample text.',
        lang: 'en',
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
        category: 'ambient',
      });
    };
    speak();
  }

  changeCat(ev: any) {
    console.log(ev.target.value);
    this.sub_cat_id = 0;
    this.subCat = [];
    if (ev.target.value === 1) {
      this.subCat = this.digitalCat;
    } else if (ev.target.value === 3) {
      this.subCat = this.meterCat;
    } else {
      this.updateStackedChart();
    }
  }

  changeSubCat(ev: any) {
    this.updateStackedChart();
  }

  stopSpeak() {
    TextToSpeech.stop();
  }

  permission() {
    SpeechRecognition.requestPermissions().then(res => {
      console.log(res);
    })
  }

  listen() {
    SpeechRecognition.start({
      language: "en-US",
      maxResults: 2,
      prompt: "Say something",
      partialResults: true,
      popup: true,
    }).then(res => {
      console.log(res);
    })
  }

  removeListen() {
    SpeechRecognition.removeAllListeners();
  }


  ionViewWillLeave() {
    this.dismissloading();
  }

  async presentToast() {
    const toast = await this.toastController.create({
      message: 'Press again to exit',
      duration: 3000
    });
    toast.present();
  }

  getMenuDetail() {
    this.presentLoading().then(preLoad => {
      this.listMaster.getMenuDetail().then(data => {
        this.dismissloading();
        this.result = data;
        if (this.result.status == true) {
          this.myMenu = this.result.data[0].submenu;
          this.chunkedArray(this.result.data[0].submenu)
          localStorage.setItem('home_menu', JSON.stringify(this.myMenu));
        }
      }, err => {
        this.dismissloading();
      });
    });
  }

  chunkedArray(array: any) {
    const perChunk = 2
    const result = array.reduce((resultArray: any, item: any, index: any) => {
      const chunkIndex = Math.floor(index/perChunk)
      if(!resultArray[chunkIndex]) {
        resultArray[chunkIndex] = []
      }
      resultArray[chunkIndex].push(item)
      return resultArray
    }, [])
    this.menuTemp = [...result];
    this.menuNew = [];
    for (var i = 0 ; i < this.menuTemp.length; i++) {
      this.menuNew.push({menu: this.menuTemp[i]});
    }
    console.log(this.menuNew);
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

  openPage(data: any) {
    this.common.checkInternet().then(res => {
      if (res) {
        if (data.link == 'not') {
          this.common.presentToast('Not activated yet', 'warning' );
          return;
        }
        this.router.navigateByUrl(data.link);
        return;
      } else {
        console.log(data);
        if (data.smnu_id == 403) {
          this.router.navigateByUrl('/digital-checklist-offline');
        } else {
          this.common.presentToast(data.smnu_desc + ' Not Working on Offline Mode.', 'warning')
        }
      }
    })
  }

  changeDateComponent(ev: any) {
    console.log(ev.detail.value);
    this.popoverDatetime.confirm(true);

  }

  slideDidChange(){
    console.log('abc');
    // if (this.menuNew.length > 0) {
    //   this.slides.getActiveIndex().then(index => {
    //       if (index === 6) {
    //         this.slides.slideTo(2);
    //       }
    //   });
    // }
  }


  slideTransitionEnd(event: any) {
    // const slides = event.target;
    // const currentIndex = slides.getActiveIndex();
    // const realIndex = currentIndex === slides.length() ? 0 : currentIndex;

    // console.log('Real Active Index:', realIndex);
  }

  randomIntArrayInRange = (min: any, max: any, n = 1) => Array.from( { length: n }, () => Math.floor(Math.random() * (max - min + 1)) + min)

  stackedBarChart() {
    this.stackedChart = new Chart('canvas', {
      type: 'bar',
      data : {
        labels: ['15 Oct','16 Oct','17 Oct','18 Oct','19 Oct','20 Oct','21 Oct',],
        datasets: [
        {
          label: 'Assign',
          data: this.res,
          backgroundColor: 'blue',
        },
        {
          label: 'Attend',
          data: this.total,
          backgroundColor: 'orange',
        }]
      },
      options: {
        plugins: {
          title: {
            display: true,
            text: 'Reporting'
          },
        },
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            stacked: true,
          },
          y: {
            stacked: true
          }
        }
      }
    });
  }

  updateStackedChart() {
    console.log('abc');
    const newDataValues = this.randomIntArrayInRange(12, 35, 7);
    console.log(newDataValues);
    this.stackedChart.data.datasets[0].data = this.randomIntArrayInRange(12, 35, 7);
    this.stackedChart.data.datasets[1].data = this.randomIntArrayInRange(12, 35, 7);
    this.stackedChart.update();
  }

  lineBarChart() {
    new Chart('canvas1', {
      type: 'line',
      data : {
        labels: ['15 Oct','16 Oct','17 Oct','18 Oct','19 Oct','20 Oct','21 Oct',],
        datasets: [
          {
            label: 'Assign',
            data: this.randomIntArrayInRange(12, 35, 7),
            fill: false,
            borderColor: 'blue',
            backgroundColor: 'blue',
            tension: 0.4,
            borderJoinStyle: 'round',
          },
          {
            label: 'Resolve',
            data: this.randomIntArrayInRange(12, 35, 7),
            fill: false,
            borderColor: 'orange',
            backgroundColor: 'orange',
            tension: 0.4,
            borderJoinStyle: 'round',
          }
        ]
      },
      options: {
        indexAxis: 'x',
        elements: {
          bar: {
            borderWidth: 0.1,
          }
        },
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: 'Helpdesk',
          }
        }
      },
    })
  }
}
