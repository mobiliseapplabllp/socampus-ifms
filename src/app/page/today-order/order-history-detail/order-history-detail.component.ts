import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-order-history-detail',
  templateUrl: './order-history-detail.component.html',
  styleUrls: ['./order-history-detail.component.scss'],
})
export class OrderHistoryDetailComponent  implements OnInit {
  order_details: any = [{
    item_code: 'Cambro - 442626',
    item_name: 'Shahi Paneer',
    item_qty: '15kg',
    cat: 'veg',
    status: 'pending',
    cat_img: 'assets/meal/veg.png'
  },{
    item_code: 'Cambro - 442627',
    item_name: 'Shahi Paneer',
    item_qty: '15kg',
    cat: 'veg',
    status: 'completed',
    cat_img: 'assets/meal/non-veg.png'
  },{
    item_code: 'Cambro - 442626',
    item_name: 'Shahi Paneer',
    item_qty: '15kg',
    cat: 'veg',
    status: 'pending',
    cat_img: 'assets/meal/veg.png'
  },{
    item_code: 'Cambro - 442626',
    item_name: 'Shahi Paneer',
    item_qty: '15kg',
    cat: 'veg',
    status: 'completed',
    cat_img: 'assets/meal/non-veg.png'
  },{
    item_code: 'Cambro - 442626',
    item_name: 'Shahi Paneer',
    item_qty: '15kg',
    cat: 'veg',
    status: 'pending',
    cat_img: 'assets/meal/veg.png'
  },{
    item_code: 'Cambro - 442627',
    item_name: 'Shahi Paneer',
    item_qty: '15kg',
    cat: 'veg',
    status: 'completed',
    cat_img: 'assets/meal/non-veg.png'
  },{
    item_code: 'Cambro - 442626',
    item_name: 'Shahi Paneer',
    item_qty: '15kg',
    cat: 'veg',
    status: 'pending',
    cat_img: 'assets/meal/veg.png'
  },{
    item_code: 'Cambro - 442626',
    item_name: 'Shahi Paneer',
    item_qty: '15kg',
    cat: 'veg',
    status: 'completed',
    cat_img: 'assets/meal/non-veg.png'
  }]
  constructor() { }

  ngOnInit() {}

}
