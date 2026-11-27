import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

// Backend: {BASE_URL}/incident/...  Har response { status, msg, data } hota hai (HTTP 200 par bhi status false aa sakta hai)
@Injectable({
  providedIn: 'root'
})
export class IncidentService {
  private base = environment.url + 'incident/';
  severityList: string[] = ['Low', 'Medium', 'High', 'Critical'];

  constructor(
    private https: HttpClient
  ) { }

  getIncidentTypes(): Observable<any> {
    return this.https.get(this.base + 'select_incident_type');
  }

  getDepartments(): Observable<any> {
    return this.https.get(environment.url + 'get_departments');
  }

  // multipart/form-data (attachment optional)
  addIncident(formData: FormData): Observable<any> {
    return this.https.post(this.base + 'add_incident_action', formData);
  }

  // params: search, pc_id, incident_type_id, department_id, severity, date_from, date_to, paginate, limit, page
  getIncidents(params: any): Observable<any> {
    return this.https.get(this.base + 'get_incident_master', { params });
  }

  getIncident(id: any): Observable<any> {
    return this.https.get(this.base + 'getSpecificIncident/' + id);
  }

  getDashboard(): Observable<any> {
    return this.https.get(this.base + 'get_incident_dashboard_counts');
  }

  severityColor(severity: string): string {
    return severity === 'Critical' ? 'danger' : severity === 'High' ? 'warning' : severity === 'Medium' ? 'primary' : 'success';
  }

  siteName(row: any): string {
    return [row?.pc_ext_id, row?.pc_desc].filter(v => !!v).join(' ');
  }
}
