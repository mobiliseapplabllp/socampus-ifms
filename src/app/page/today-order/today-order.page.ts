import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-today-order',
  templateUrl: './today-order.page.html',
  styleUrls: ['./today-order.page.scss'],
})
export class TodayOrderPage implements OnInit {
  todayOrder: any = [{
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
    color: 'warning'
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
    color: 'tertiary'
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
    color: 'medium'
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
    color: 'secondary'
  }];
  constructor(
    private router: Router
  ) { }

  ngOnInit() {

  }

  viewBox() {
    this.router.navigateByUrl('/today-order/order-detail');
  }

  history() {
    this.router.navigateByUrl('/today-order/order-history');
  }

  orderReceived() {
    this.router.navigateByUrl('/today-order/order-received');
  }

}
