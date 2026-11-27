import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonService } from 'src/app/provider/common/common.service';
import { IncidentService } from 'src/app/provider/incident/incident.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-incident-detail',
  templateUrl: './incident-detail.component.html',
  styleUrls: ['./incident-detail.component.scss'],
})
export class IncidentDetailComponent implements OnInit {
  incident: any = null;

  constructor(
    private activeRoute: ActivatedRoute,
    private common: CommonService,
    public httpIncident: IncidentService
  ) { }

  ngOnInit() {
    const id = this.activeRoute.snapshot.paramMap.get('id');
    this.getIncident(id);
  }

  getIncident(id: any) {
    this.common.presentLoading().then(preLoad => {
      this.httpIncident.getIncident(id).subscribe({
        next: (res: any) => {
          if (res.status) {
            this.incident = res.data;
          } else {
            this.common.presentToast(res.msg || 'Incident Not Found', 'warning');
          }
        },
        error: () => {
          this.common.dismissloading();
          this.common.presentToast(environment.errMsg, 'danger');
        },
        complete: () => {
          this.common.dismissloading();
        }
      });
    });
  }

  // attachment private blob path hai, blob-url API se khulta hai
  viewAttachment() {
    this.common.openImg(this.incident.attachment, this.incident.attachment_blob_type);
  }

}
