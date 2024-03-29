import { Component, OnInit } from '@angular/core';
import { CommonService } from 'src/app/provider/common/common.service';
import { ListMasterService } from 'src/app/provider/list-master/list-master.service';
@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent  implements OnInit {
  breakdown!: string;
  pms!: string;
  indent!: string;
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
  constructor(
    private httpList: ListMasterService,
    private common: CommonService
  ) { }

  ngOnInit() {
    this.common.checkInternet().then(res => {
      if (res) {
        this.getDashboard();
      } else {
        let obj =  JSON.parse(localStorage.getItem('dashboard')!);
        console.log(obj);
        this.breakdown = obj.breakdown;
        this.pms = obj.pms,
        this.indent = obj.indent
      }
    });
  }

  getDashboard() {
    this.httpList.getDashboard().subscribe(data => {
      if (data.status) {
        this.breakdown =  data.data.breakdown.assign.toString();
        this.pms = data.data.pms.assign.toString();
        this.indent = data.data.indent.assign.toString();
        var obj: any = {
          breakdown: '',
          pms: '',
          indent: ''
        };
        obj.breakdown = this.breakdown;
        obj.pms = this.pms;
        obj.indent = this.indent;
        localStorage.setItem('dashboard', JSON.stringify(obj));
      }
    });
  }

}
