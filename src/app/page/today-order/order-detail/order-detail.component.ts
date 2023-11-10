import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-order-detail',
  templateUrl: './order-detail.component.html',
  styleUrls: ['./order-detail.component.scss'],
})
export class OrderDetailComponent  implements OnInit {
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
    status: 'picked',
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
    status: 'picked',
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
    status: 'picked',
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
    status: 'picked',
    cat_img: 'assets/meal/non-veg.png'
  }]
  constructor() { }

  ngOnInit() {}

}
