import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonService } from 'src/app/provider/common/common.service';
import { DmsService } from 'src/app/provider/dms/dms.service';

@Component({
  selector: 'app-doc-detail',
  templateUrl: './doc-detail.component.html',
  styleUrls: ['./doc-detail.component.scss'],
})
export class DocDetailComponent implements OnInit {
  id: any;
  detail: any = null;
  tab = 'info';
  versions: any[] = [];
  timeline: any[] = [];
  comments: any[] = [];
  commentText = '';
  tabLoading = false;
  sending = false;

  constructor(
    private activeRoute: ActivatedRoute,
    private common: CommonService,
    public dms: DmsService
  ) { }

  ngOnInit() {
    this.id = this.activeRoute.snapshot.paramMap.get('id');
    this.load();
  }

  // Buttons hamesha permissions flags se chalte hain, role check hardcode nahi
  get doc(): any { return this.detail?.document; }
  get perm(): any { return this.detail?.permissions || {}; }
  get version(): any { return this.detail?.display_version; }

  get metaFields(): any[] {
    return (this.detail?.fields || []).map((f: any) => ({ label: f.label, value: this.doc?.metadata?.[f.key] }))
      .filter((f: any) => f.value !== undefined && f.value !== null && f.value !== '');
  }

  async load(showLoader = false, ev?: any) {
    if (showLoader) {
      await this.common.presentLoading();
    }
    try {
      await this.dms.init();
      this.detail = await this.dms.document(this.id);
      await this.loadTab();
    } catch (e) {
      this.dms.showError(e);
    }
    if (showLoader) {
      this.common.dismissloading();
    }
    ev?.target?.complete();
  }

  async loadTab() {
    this.tabLoading = this.tab !== 'info';
    try {
      if (this.tab === 'versions') {
        this.versions = await this.dms.versions(this.id) || [];
      } else if (this.tab === 'workflow') {
        this.timeline = await this.dms.timeline(this.id) || [];
      } else if (this.tab === 'comments') {
        this.comments = await this.dms.comments(this.id) || [];
      }
    } catch (e) {
      this.dms.showError(e);
    }
    this.tabLoading = false;
  }

  async toggleFavourite() {
    try {
      this.detail.is_favourite = await this.dms.toggleFavourite(this.id);
    } catch (e) {
      this.dms.showError(e);
    }
  }

  viewFile(version?: any) {
    this.dms.openFile(this.id, version?.id || null);
  }

  async submitForReview() {
    const comment = await this.dms.promptText('Submit for review', 'Comment (optional)', false);
    if (comment === null) {
      return;
    }
    await this.common.presentLoading();
    try {
      await this.dms.submit(this.id, comment);
      this.common.presentToast('Submitted for review', 'success');
      // status badalte hi permissions badal jati hain, isliye detail reload
      await this.load();
    } catch (e) {
      this.dms.showError(e);
    }
    this.common.dismissloading();
  }

  async addComment() {
    const body = this.commentText.trim();
    if (!body) {
      this.common.presentToast('Comment cannot be empty', 'warning');
      return;
    }
    this.sending = true;
    try {
      await this.dms.addComment(this.id, body);
      this.commentText = '';
      this.comments = await this.dms.comments(this.id) || [];
    } catch (e) {
      this.dms.showError(e);
    }
    this.sending = false;
  }

  fileSize(bytes: number): string {
    if (!bytes) { return ''; }
    return bytes > 1048576 ? (bytes / 1048576).toFixed(1) + ' MB' : Math.ceil(bytes / 1024) + ' KB';
  }

}
