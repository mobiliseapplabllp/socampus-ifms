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

  getTodayOrderDriver(id: string, date?: string): Observable<any> {
    let url: any;
    // 1 for order dispatch and 2 for order recevier
    if (id === '1') {
      url = environment.url + 'meal/order/get_order_by_status?req_for=driver&status_type=today-pending';
    } else if (id === '2') {
      url = environment.url + 'meal/order/get_order_by_status?req_for=site&status_type=today-pending';
    } else if (id === '3'){
      url = environment.url + 'meal/order/get_order_by_status?ord_date=' + date;
    } else {
      alert('Wrong Paramter');
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

  getEncodedUrl(data: any): Observable<any> {
    let url;
    url = 'https://hr-access.herokuapp.com/https://maps.googleapis.com/maps/api/directions/json?origin=' + data.startlat + ',' + data.startlng + '&destination=' + data.endlat + ',' + data.endlng + '&mode=driving&key=AIzaSyB7YzAgPdBSGOgSij5inIDNofGfnTu3x9M';
    return this.https.get(url);
  }

  orderReached(ord_id: any): Observable<any> {
    const obj = {
      order_id: ord_id
    }
    return this.https.post(environment.url + 'meal/order/order_reached', obj);
  }

//   https://ifmsuat.mobilisepro.com/backend/api/meal/order/order_reached
// FormData:-
// order_id:{val}

}
