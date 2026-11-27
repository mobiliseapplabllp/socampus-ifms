import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonService } from 'src/app/provider/common/common.service';
import { DmsService } from 'src/app/provider/dms/dms.service';

@Component({
  selector: 'app-doc-tasks',
  templateUrl: './doc-tasks.component.html',
  styleUrls: ['./doc-tasks.component.scss'],
})
export class DocTasksComponent implements OnInit {
  buckets = [
    { key: 'all', label: 'Pending' },
    { key: 'reviews', label: 'Reviews' },
    { key: 'approvals', label: 'Approvals' },
    { key: 'overdue', label: 'Overdue' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'history', label: 'History' }
  ];
  bucket = 'all';
  counts: any = {};
  tasks: any[] = [];
  loaded = false;

  constructor(
    private router: Router,
    private common: CommonService,
    public dms: DmsService
  ) { }

  ngOnInit() {
  }

  ionViewWillEnter() {
    this.load();
  }

  async load(ev?: any) {
    try {
      await this.dms.init();
      const [tasks, counts] = await Promise.all([this.dms.tasks(this.bucket), this.dms.taskCounts()]);
      this.tasks = tasks || [];
      this.counts = counts || {};
    } catch (e) {
      this.dms.showError(e);
    }
    this.loaded = true;
    ev?.target?.complete();
  }

  changeBucket() {
    this.tasks = [];
    this.loaded = false;
    this.load();
  }

  // Sirf apne pending task par action dikhte hain
  canAct(row: any): boolean {
    return row?.task?.state === 'pending' && String(row.task.assignee_id) === String(this.dms.me?.id);
  }

  stateColor(state: string): string {
    return state === 'approved' ? 'success' : state === 'rejected' || state === 'changes_requested' ? 'danger' : state === 'pending' ? 'warning' : 'medium';
  }

  async act(row: any, action: string, ev: Event) {
    ev.stopPropagation();
    const label = action === 'approve' ? 'Approve' : action === 'reject' ? 'Reject' : 'Request Changes';
    // approve ke alawa har action me comment zaroori hai
    const comment = await this.dms.promptText(label, 'Comment', action !== 'approve');
    if (comment === null) {
      return;
    }
    await this.common.presentLoading();
    try {
      await this.dms.taskAction(row.task.id, action, comment);
      this.common.presentToast(label + ' done', 'success');
      await this.load();
    } catch (e) {
      this.dms.showError(e);
    }
    this.common.dismissloading();
  }

  openDetail(row: any) {
    this.router.navigate(['/doc-mgt/detail', row.task.document_id]);
  }

}
