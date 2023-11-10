import { Component, OnInit, ViewChild } from '@angular/core';
import { Route, Router } from '@angular/router';
import { IonSlides } from '@ionic/angular';
import * as moment from 'moment';

@Component({
  selector: 'app-order-history',
  templateUrl: './order-history.component.html',
  styleUrls: ['./order-history.component.scss'],
})
export class OrderHistoryComponent  implements OnInit {
  @ViewChild(IonSlides) slides!: IonSlides;
  slideBanner = {
    initialSlide: 0,
    slidesPerView: 5,
    autoplay: false,
    breakpoints: {
      320: {
        slidesPerView: 5,
      },
      480: {
        slidesPerView: 6,
      },
      530: {
        slidesPerView: 7,
      },
      640: {
        slidesPerView: 8,
      },
      700: {
        slidesPerView: 9,
      },
    }
  };
  dateArr: any = [];
  history: any = [{
    order_id: 'OD1982',
    pick_time: '11:00',
    delivery_time: '12:30',
    box: '125/05',
    pc: '100023',
    location: 'Google Campus',
    color: 'danger'
  },{
    order_id: 'OD1982',
    pick_time: '11:00',
    delivery_time: '12:30',
    box: '125/05',
    pc: '100023',
    location: 'Google Campus',
    color: 'danger'
  },{
    order_id: 'OD1982',
    pick_time: '11:00',
    delivery_time: '12:30',
    box: '125/05',
    pc: '100023',
    location: 'Google Campus',
    color: 'success'
  },{
    order_id: 'OD1982',
    pick_time: '11:00',
    delivery_time: '12:30',
    box: '125/05',
    pc: '100023',
    location: 'Google Campus',
    color: 'success'
  },{
    order_id: 'OD1982',
    pick_time: '11:00',
    delivery_time: '12:30',
    box: '125/05',
    pc: '100023',
    location: 'Google Campus',
    color: 'danger'
  },{
    order_id: 'OD1982',
    pick_time: '11:00',
    delivery_time: '12:30',
    box: '125/05',
    pc: '100023',
    location: 'Google Campus',
    color: 'success'
  },{
    order_id: 'OD1982',
    pick_time: '11:00',
    delivery_time: '12:30',
    box: '125/05',
    pc: '100023',
    location: 'Google Campus',
    color: 'danger'
  },{
    order_id: 'OD1982',
    pick_time: '11:00',
    delivery_time: '12:30',
    box: '125/05',
    pc: '100023',
    location: 'Google Campus',
    color: 'danger'
  },{
    order_id: 'OD1982',
    pick_time: '11:00',
    delivery_time: '12:30',
    box: '125/05',
    pc: '100023',
    location: 'Google Campus',
    color: 'success'
  }];
  constructor(
    private router: Router
  ) { }

  ngOnInit() {
    let start: any, end: any;
    end = moment().endOf('month').format('DD');
    let status, index = 0;
    for (let i = 1; i <= end ; i++) {
      if (moment().format('YYYY-MM-DD') ==  moment().startOf('month').add(i - 1, 'day').format('YYYY-MM-DD')) {
        status = true;
        index = i;
      } else {
        status = false
      }
      this.dateArr.push({
        date: moment().startOf('month').add(i - 1, 'day').format('DD'),
        day: moment().startOf('month').add(i - 1, 'day').format('dddd')[0],
        isSelect: status,
        ind: i,
        fulldate : moment().startOf('month').add(i - 1, 'day').format('YYYY-MM-DD')
      })
    }
    setTimeout(() => {
      this.slides.slideTo(index - 3);
    }, 50);
  }

  changeDate(dat: any) {
    this.slides.slideTo(dat.ind - 3);
    for (var i = 0 ; i < this.dateArr.length; i++) {
      if (dat.date == this.dateArr[i].date) {
        this.dateArr[i].isSelect= true
      } else {
        this.dateArr[i].isSelect= false
      }
    }
  }

  status() {

  }

  orderDetails() {
    this.router.navigateByUrl('/today-order/order-history-detail');
  }

}
