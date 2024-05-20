import { HttpClient, HttpParams } from '@angular/common/http';
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

  getOrderHistory(data: any): Observable<any> {
    const obj = {
      page: 1,
      limit: 20,
      tab: 'pending',
      main_sec: 'orderwise',
      sdate: data.sdate,
      edate: data.edate,
    }
    return this.https.get(environment.url + 'meal/order/history/orderwise?limit=20&page=1&sdate=' + data.sdate + '&edate=' + data.edate + '&tab=pending&main_sec=orderwise')
  }

  updateTemperature(obj: any): Observable<any> {
    return this.https.post(environment.url + 'meal/order/updte_order_recipe_temp', obj);
  }

  updateRecipePacking(obj: any): Observable<any> {
    return this.https.post(environment.url + 'meal/order/updte_order_recipe_packing_qty', obj);
  }

  actionOrderPack(formData: any): Observable<any> {
    return this.https.post(environment.url + 'meal/order/order_packed', formData);
  }

  getTodayOrderDetail(ord_id: any): Observable<any> {
    return this.https.get(environment.url + 'meal/order/get_order_cambro_dtl?order_id='+ ord_id)
  }

  getOrderDetailView(ord_id: any): Observable<any> {
    return this.https.get(environment.url + 'meal/order/getOrderDetailsView?order_id=' + ord_id)
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

  getCkmsSite(): Observable<any> {
    return this.https.get(environment.url + 'meal/cpu/ckms_site_data')
  }

  getReturnCmbroData(site_id: any): Observable<any> {
    const formData = new FormData();
    formData.append('site_id', site_id);
    return this.https.post(environment.url + 'meal/cambroReturn/cmr-detail-data', formData)
  }

  returnAction(obj: any): Observable<any> {
    var arr = [];
    arr.push(obj);
    return this.https.post(environment.url + 'meal/cambroReturn/return-cambro-init', arr);
  }

  viewPdf(obj: object): Observable<any> {
    return this.https.post(environment.url + 'meal/order/downloadPDF', obj)
  }

  getReturnCambro(type: string): Observable<any> {
    return this.https.get(environment.url + 'meal/cambroReturn/get-return-cambro-list?req_for=' + type + '&status_type=pending-return');
  }

  getReturnCambroDetails(return_id: any): Observable<any> {
    return this.https.get(environment.url + 'meal/cambroReturn/get-return-cambro-detail?return_id=' + return_id)
  }

  dispatchCambro(return_id: any): Observable<any> {
    const formData = new FormData();
    formData.append('return_id', return_id);
    return this.https.post(environment.url + 'meal/cambroReturn/return-cambro-dispatch', formData)
  }

  receiveCambro(return_id: any): Observable<any> {
    const formData = new FormData();
    formData.append('return_id', return_id)
    return this.https.post(environment.url + 'meal/cambroReturn/return-cambro-reached', formData)
  }

  getOrderForDispatch(data: any): Observable<any> {
    let param = new HttpParams();
    for (const key in data) {
      if (data[key] !== '' && data[key] !== undefined && data[key] !== null) {
        param = param.append(key, data[key]);
      }
    }
    return this.https.get(environment.url + 'meal/order/get_order_count_data', { params: param });
  }

  getDispathOrderDetail(order_id: any): Observable<any> {
    return this.https.get(environment.url + 'meal/order/get_order_history?order_id=' + order_id);
  }

  getCambroByPC(pc_id: any): Observable<any> {
    return this.https.get(environment.url + 'assets/reporting/get_cambro_by_pc?pc_id=' + pc_id);
  }

  getDriverByPc(pc_id: any): Observable<any> {
    return this.https.get(environment.url + 'assets/reporting/get_driver_by_pc?pc_id=' + pc_id);
  }

  getCambroStatus(encQr: string): Observable<any> {
    return this.https.get(environment.url + 'meal/cambroReturn/cambro-info-by-barcode?barcode=' + encQr);
  }

}
