import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { env } from 'process';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
@Injectable({
  providedIn: 'root'
})
export class IndentsService {

  constructor(
    private https: HttpClient
  ) { }

  getWarehousePc(pd_id: any): Observable<any> {
    return this.https.get(environment.url + 'setups/organisation/get_warehouse_by_pc?pc_id=' + pd_id);
  }

  getIndentType(): Observable<any> {
    return this.https.get(environment.url + 'purchase/settings/select_type')
  }

  getMaterial(type: string, org_id: any): Observable<any> {
    return this.https.get(environment.url + 'purchase/settings/select_material_on_type?org_id=' + org_id + '&type=' + type);
  }

  searchUser(username: string): Observable<any> {
    return this.https.get(environment.url + 'search_emp_by_id/' + username);
  }

  getUom(): Observable<any> {
    return this.https.get(environment.url + 'purchase/settings/select_uom')
  }

  submitIndent(formData: any): Observable<any> {
    return this.https.post(environment.url + 'purchase/mtrl_request/add_mtrl_request', formData);
  }

  editIndent(id: any): Observable<any> {
    return this.https.get(environment.url + 'purchase/mtrl_request/get_edit_mtrl_request/' + id)
  }

  editAction(formData: any): Observable<any> {
    return this.https.post(environment.url + 'purchase/mtrl_request/edit_mtrl_request', formData);
  }

  getTktTran(id: any): Observable<any> {
    return this.https.get(environment.url + 'complaints/get_tkt_trans/' + id);
  }
  
  getPmsTnx(wo_id: string): Observable<any> {
    return this.https.get(environment.url + 'purchase/mtrl_request/get_mtrl_request_master?limit=30&&page=1&is_excel=0&for=forPpm&wo_id=' + wo_id);
  }

  getMaterialType(): Observable<any> {
    return this.https.get(environment.url + 'purchase/settings/select_material');
  }

  getPartCode() {
    return new Promise(resolve => {
      this.https.get(environment.url + 'get_item_master.php').subscribe({
        next:(data) => {
          resolve(data)
        },
        error:() => {
          resolve(false);
        }
      });
    });
  }

  // submitIndent(formData: any): Observable<any> {
  //   return this.https.post(environment.url + 'purchase/mtrl_request/add_mtrl_request', formData);
  // }

  getEmpSearch(emp_id: any): Observable<any> {
    const obj = {
      key: emp_id
    }
    return this.https.post(environment.url + 'emp_search', obj);
  }

  getMyIndent(page: any, status: any): Observable<any> {
    let posturl;
    posturl = 'limit=10&page=' + page + '&is_excel=0&type=my-indent&status=' + status
    return this.https.get(environment.url + 'purchase/mtrl_request/get_mtrl_request_master?' + posturl)
  }

  cancelIndent(data: any): Observable<any> {
    return this.https.post(environment.url + 'purchase/mtrl_request/cancel_mtrl_request', data);
  }

  getIndentLogs(rqst_id: any): Observable<any> {
    return this.https.get(environment.url + 'purchase/mtrl_request/cntr_indnt_data_logs?limit=20&page=1&rqst_id=' + rqst_id);
  }
  
  getRequesteeList(arr: any): Observable<any> {
    return this.https.get(environment.url + 'shared/get-users-list-pc-wise?pc_id=' + arr.pc_id);
    // https://socampusdev.mobilisepro.com/be/api/purchase/settings/get_indent_material_by_pc?org_id=1&type=6&pc_id=13
    // return this.https.get(environment.url + 'purchase/settings/get_indent_material_by_pc?pc_id=' + arr.pc_id + '&org_id=' + arr.org_id + '&type=' + arr.mtrl_type);
  }
}
