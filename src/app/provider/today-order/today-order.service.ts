import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TodayOrderService {

  constructor(
    public https: HttpClient
  ) { }

  getTodayOrderDriver(id: string): Observable<any> {
    let url: any;
    // 1 for order dispatch and 2 for order recevier
    if (id === '1') {
      url = environment.url + 'meal/order/get_order_by_status?ord_status=5';
    } else if (id === '2') {
      url = environment.url + 'meal/order/get_order_by_status?ord_status=6';
    } else {
      alert('Wrong Parameter');
    }
    return this.https.get(url);
  }

  getTodayOrderDetail(ord_id: any): Observable<any> {
    return this.https.get(environment.url + 'meal/order/get_order_cambro_dtl?order_id='+ ord_id)
  }

  orderDispatch(ord_id: any): Observable<any> {
    const obj = {
      order_id: ord_id
    }
    return this.https.post(environment.url + 'meal/order/order_dispatch', obj);
  }

  reciveOrder(obj: any): Observable<any> {
    return this.https.post(environment.url + 'meal/order/order_received_qty', obj);
  }

  reciveOrderFinal(ord_id: string): Observable<any> {
    const obj = {
      order_id: ord_id
    }
    return this.https.post(environment.url + 'meal/order/order_received', obj);
  }

}
