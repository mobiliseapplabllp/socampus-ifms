import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { firstValueFrom, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { CommonService } from '../common/common.service';

// Document Management (DMS) - backend prefix {BASE_URL}/dms
// Har response HTTP 200 + { status, msg, data } hota hai; ids hamesha string hote hain.
@Injectable({
  providedIn: 'root'
})
export class DmsService {
  private base = environment.url + 'dms/';
  me: any = null;
  reference: any = null;

  constructor(
    private https: HttpClient,
    private common: CommonService,
    private alertCtrl: AlertController
  ) { }

  // status false ya network error par Error throw karta hai (message user ko dikhane layak)
  private async req(obs: Observable<any>): Promise<any> {
    let res: any;
    try {
      res = await firstValueFrom(obs);
    } catch (e) {
      throw new Error(environment.errMsg);
    }
    if (!res?.status) {
      throw new Error(res?.msg || 'Something went wrong, please try again');
    }
    return res.data;
  }

  private clean(params: any = {}) {
    const out: any = {};
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        out[key] = params[key];
      }
    });
    return out;
  }

  get(path: string, params?: any): Promise<any> {
    return this.req(this.https.get(this.base + path, { params: this.clean(params) }));
  }

  post(path: string, body: any = {}): Promise<any> {
    return this.req(this.https.post(this.base + path, body));
  }

  showError(e: any) {
    this.common.presentToast(e?.message || environment.errMsg, 'warning');
  }

  // /me aur /reference module khulte hi ek baar load hote hain, phir cache
  async init(force = false) {
    if (!this.reference || !this.me || force) {
      const [me, reference] = await Promise.all([this.get('me'), this.get('reference')]);
      this.me = me;
      this.reference = reference;
    }
  }

  // ---------- reference helpers ----------
  statusLabel(key: string): string {
    const st = (this.reference?.statuses || []).find((s: any) => s.key === key);
    return st?.label || String(key || '').replace(/_/g, ' ');
  }

  toneColor(tone: string): string {
    return tone === 'success' ? 'success' : tone === 'danger' ? 'danger' : tone === 'warning' ? 'warning' : tone === 'info' ? 'primary' : 'medium';
  }

  statusColor(key: string): string {
    const st = (this.reference?.statuses || []).find((s: any) => s.key === key);
    if (st?.tone) {
      return this.toneColor(st.tone);
    }
    return key === 'published' || key === 'approved' ? 'success' : key === 'changes_requested' ? 'danger' : key === 'draft' ? 'medium' : 'primary';
  }

  refName(list: string, id: any): string {
    const item = (this.reference?.[list] || []).find((x: any) => String(x.id) === String(id));
    return item?.name || '';
  }

  rootCategory(categoryId: any): any {
    const cats = this.reference?.categories || [];
    let cat = cats.find((c: any) => String(c.id) === String(categoryId));
    while (cat && cat.parent_id) {
      const parent = cats.find((c: any) => String(c.id) === String(cat.parent_id));
      if (!parent) { break; }
      cat = parent;
    }
    return cat;
  }

  // ---------- APIs ----------
  dashboard() { return this.get('dashboard', { view: 'employee' }); }
  categoriesTree() { return this.get('categories/tree'); }
  documents(params: any) { return this.get('documents', params); }
  recent() { return this.get('documents/recent'); }
  favourites() { return this.get('documents/favourites'); }
  document(id: any) { return this.get('documents/' + id); }
  toggleFavourite(id: any) { return this.post('documents/' + id + '/favourite'); }
  versions(id: any) { return this.get('documents/' + id + '/versions'); }
  timeline(id: any) { return this.get('documents/' + id + '/timeline'); }
  comments(id: any) { return this.get('documents/' + id + '/comments'); }
  addComment(id: any, body: string) { return this.post('documents/' + id + '/comments', { body, version_id: null, parent_id: null }); }
  submit(id: any, comment: string) { return this.post('documents/' + id + '/submit', { comment }); }
  numberingPreview(params: any) { return this.get('documents/numbering-preview', params); }
  createDocument(formData: FormData) { return this.post('documents', formData); }
  tasks(bucket: string) { return this.get('tasks', { bucket }); }
  taskCounts() { return this.get('tasks/counts'); }
  taskAction(taskId: any, action: string, comment: string) { return this.post('tasks/' + taskId + '/action', { action, comment, delegate_to: null }); }
  notifications() { return this.get('notifications'); }
  unreadCount() { return this.get('notifications/unread-count'); }
  markRead(id: any) { return this.post('notifications/' + id + '/read'); }

  // File seedhe URL se nahi milti, base64 me aati hai. vid = null => default version
  async openFile(docId: any, versionId: any = null) {
    await this.common.presentLoading('Opening file...');
    try {
      const data = await this.post('documents/' + docId + '/versions/' + (versionId || 'null') + '/download-url', { disposition: 'view' });
      const mime = String(data?.mime || '');
      if (mime === 'application/pdf') {
        this.common.pdfView('data:application/pdf;base64,' + data.base64);
      } else if (mime.startsWith('image/')) {
        this.common.imageView('data:' + mime + ';base64,' + data.base64, null);
      } else {
        this.common.presentToast('This file type (' + (data?.name || mime) + ') cannot be previewed in the app', 'warning');
      }
    } catch (e) {
      this.showError(e);
    }
    this.common.dismissloading();
  }

  // Reason / comment lene ka chhota popup. Cancel par null lautata hai.
  async promptText(header: string, placeholder: string, required: boolean): Promise<string | null> {
    return new Promise(async resolve => {
      const alert = await this.alertCtrl.create({
        header,
        inputs: [{ name: 'text', type: 'textarea', placeholder }],
        buttons: [
          { text: 'Cancel', role: 'cancel', handler: () => resolve(null) },
          {
            text: 'Submit',
            handler: (val: any) => {
              const text = String(val?.text || '').trim();
              if (required && !text) {
                this.common.presentToast(placeholder + ' is required', 'warning');
                return false;
              }
              resolve(text);
              return true;
            }
          }
        ]
      });
      alert.present();
    });
  }
}
