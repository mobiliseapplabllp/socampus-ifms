import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController, ModalController, ToastController } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { ListMasterService } from 'src/app/provider/list-master/list-master.service';
import { LoginService } from 'src/app/provider/login/login.service';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { SpeechRecognition } from "@capacitor-community/speech-recognition";
import Chart from 'chart.js/auto';
@Component({
  selector: 'app-list-master',
  templateUrl: './list-master.page.html',
  styleUrls: ['./list-master.page.scss'],
})
export class ListMasterPage implements OnInit {
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
  breakdown: any = {};
  pr: any = {};
  indent: any = {};
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
  constructor(
    private listMaster: ListMasterService,
    private toastController: ToastController,
    private loginPro: LoginService,
    private loadingController: LoadingController,
    private common: CommonService,
    public router: Router,
    private modalCtrl: ModalController) {
    const user = localStorage.getItem('user');
    if (user) {
      this.userData = JSON.parse(user);
      this.userName = this.userData.user_name
    }
  }

  ngOnInit() {
    this.circleVal = 722 - this.circleData * 7.22;

    this.common.checkInternet().then(res => {
      if (res) {
        this.isInternet = true;
        this.common.setBarcode('');
        this.userData = this.loginPro.getLoginUserValue();
        this.getMenuDetail();
        this.getDashboard();
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

    // this.chart = new Chart('canvas', {
    //   type: 'bar',
    //   data: {
    //     labels: ['Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange'],
    //     datasets: [{
    //       label: 'Reporting',
    //       data: [12, 18, 3, 5, 2, 3],
    //       borderWidth: 1,
    //       backgroundColor: '#25589c'
    //     }],
    //   },
    //   options: {
    //     scales: {
    //       y: {
    //         beginAtZero: true,
    //       },
    //     },
    //   },
    // });
    this.stackedBarChart();
  }

  stackedBarChart() {
    this.chart = new Chart('canvas', {
      type: 'bar',
      data : {
        labels: ['15 Oct','16 Oct','17 Oct','18 Oct','19 Oct','20 Oct','21 Oct',],
        datasets: [
          {
            label: 'Total',
            data: [25, 20, 15, 18, 22, 19, 23],
            borderColor: '#25589c',
            backgroundColor: '#25589c',
          },
          {
            label: 'Resolved',
            data: [10, 15, 13, 17, 21, 18, 23],
            borderColor: '#93C3ED',
            backgroundColor: '#93C3ED',
          }
        ]
      },
      options: {
        indexAxis: 'x',
        // Elements options apply to all of the options unless overridden in a dataset
        // In this case, we are setting the border of each horizontal bar to be 2px wide
        elements: {
          bar: {
            borderWidth: 0.6,

          }
        },
        responsive: true,
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: 'Reporting'
          }
        }
      },
    })
  }

  getCircleValue() {

  }

  getDashboard() {
    this.listMaster.getDashboard().subscribe(data => {
      console.log(data);
      if (data.status) {
        this.breakdown = data.data.breakdown;
        this.pr = data.data.pms;
        this.indent = data.data.indent
      }
    });
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
    });
    SpeechRecognition.addListener("partialResults", (data: any) => {
      console.log("partialResults was fired", data.matches);
    });
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
}
