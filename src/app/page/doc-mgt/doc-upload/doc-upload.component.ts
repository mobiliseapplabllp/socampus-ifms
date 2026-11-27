import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController, NavController } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { DmsService } from 'src/app/provider/dms/dms.service';
import { DocPickerComponent } from '../doc-picker/doc-picker.component';

@Component({
  selector: 'app-doc-upload',
  templateUrl: './doc-upload.component.html',
  styleUrls: ['./doc-upload.component.scss'],
})
export class DocUploadComponent implements OnInit {
  // type me extensions na hon to server ka default
  readonly defaultExt = ['pdf', 'png', 'jpg', 'jpeg', 'docx', 'doc', 'xlsx', 'xls', 'pptx', 'dwg', 'dxf', 'txt', 'csv'];
  readonly maxMb = 25;
  confidentialityList = ['public', 'internal', 'confidential', 'restricted'];

  form: any = {
    category_id: '', category_name: '', title: '', plant_id: '', plant_name: '', type_id: '',
    dept_id: '', dept_name: '', description: '', confidentiality: '', effective_date: '',
    review_due_date: '', expiry_date: '', tags: '', change_reason: ''
  };
  meta: any = {};          // dynamic fields ki values: { <field.key>: value }
  category: any = null;
  types: any[] = [];
  fields: any[] = [];
  file: File | null = null;
  preview: any = null;     // { number, label }
  submitted = false;
  ready = false;           // reference data aane tak skeleton
  previewLoading = false;

  constructor(
    private router: Router,
    private navCtrl: NavController,
    private modalCtrl: ModalController,
    private common: CommonService,
    public dms: DmsService
  ) { }

  async ngOnInit() {
    try {
      await this.dms.init();
    } catch (e) {
      this.dms.showError(e);
    }
    this.ready = true;
  }

  get selectedType(): any {
    return this.types.find(t => String(t.id) === String(this.form.type_id));
  }

  get allowedExt(): string[] {
    const ext = this.selectedType?.allowed_extensions;
    return ext?.length ? ext : this.defaultExt;
  }

  get maxSizeMb(): number {
    return Math.min(Number(this.selectedType?.max_size_mb) || this.maxMb, this.maxMb);
  }

  get acceptAttr(): string {
    return this.allowedExt.map(e => '.' + e).join(',');
  }

  async pick(kind: 'category' | 'plant' | 'dept') {
    const ref = this.dms.reference || {};
    let items: any[] = [];
    let title = '';
    if (kind === 'category') {
      title = 'Category';
      const cats = (ref.categories || []).filter((c: any) => c.active !== false);
      items = cats.map((c: any) => {
        const parent = c.parent_id ? cats.find((p: any) => String(p.id) === String(c.parent_id)) : null;
        return { ...c, name: parent ? parent.name + ' / ' + c.name : c.name, plainName: c.name };
      });
    } else if (kind === 'plant') {
      title = 'Plant / Site';
      items = ref.plants || [];
    } else {
      title = 'Department';
      items = ref.departments || [];
    }
    const modal = await this.modalCtrl.create({
      component: DocPickerComponent,
      cssClass: 'my-modal',
      componentProps: { title, items }
    });
    modal.onWillDismiss().then(res => {
      if (!res.data) {
        return;
      }
      if (kind === 'category') {
        this.setCategory(res.data);
      } else if (kind === 'plant') {
        this.form.plant_id = res.data.id;
        this.form.plant_name = res.data.name;
        this.loadPreview();
      } else {
        this.form.dept_id = res.data.id;
        this.form.dept_name = res.data.name;
        this.loadPreview();
      }
    });
    return modal.present();
  }

  // Type aur dynamic fields category ke ROOT se aate hain
  setCategory(cat: any) {
    this.category = cat;
    this.form.category_id = cat.id;
    this.form.category_name = cat.name;
    this.form.confidentiality = cat.default_confidentiality || 'internal';
    this.form.type_id = '';
    this.meta = {};
    const root = this.dms.rootCategory(cat.id) || cat;
    const ref = this.dms.reference || {};
    this.types = (ref.types || []).filter((t: any) => String(t.category_id) === String(root.id) && t.active !== false);
    this.fields = (ref.fields || [])
      .filter((f: any) => String(f.category_id) === String(root.id) && f.active !== false)
      .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
    this.loadPreview();
  }

  async loadPreview() {
    this.preview = null;
    if (!this.form.category_id) {
      return;
    }
    this.previewLoading = true;
    try {
      this.preview = await this.dms.numberingPreview({
        category_id: this.form.category_id, plant_id: this.form.plant_id, dept_id: this.form.dept_id
      });
    } catch (e) { }
    this.previewLoading = false;
  }

  fieldKind(f: any): string {
    const type = String(f.type || '').toLowerCase();
    if (f.options?.length || type === 'select' || type === 'dropdown') { return 'select'; }
    if (type === 'date') { return 'date'; }
    if (type === 'number') { return 'number'; }
    if (type === 'textarea' || type === 'longtext') { return 'textarea'; }
    return 'text';
  }

  optValue(opt: any) { return opt?.value ?? opt; }
  optLabel(opt: any) { return opt?.label ?? opt; }

  onFile(ev: any) {
    const file: File = ev.target.files?.[0];
    ev.target.value = '';
    if (file && this.checkFile(file)) {
      this.file = file;
    }
  }

  // Server jaisa hi check device par, taaki bada upload bekar na jaye
  checkFile(file: File): boolean {
    const ext = String(file.name.split('.').pop() || '').toLowerCase();
    if (!this.allowedExt.includes(ext)) {
      this.common.presentToast('Allowed file types: ' + this.allowedExt.join(', '), 'warning');
      return false;
    }
    if (file.size > this.maxSizeMb * 1024 * 1024) {
      this.common.presentToast('File is larger than ' + this.maxSizeMb + ' MB', 'warning');
      return false;
    }
    return true;
  }

  changeType() {
    if (this.file && !this.checkFile(this.file)) {
      this.file = null;
    }
  }

  missing(): string {
    const f = this.form;
    if (!this.file) { return 'Please attach a file'; }
    if (!f.category_id) { return 'Select a category'; }
    if (!String(f.title).trim()) { return 'Title is required'; }
    if (!f.plant_id) { return 'Select a plant / site'; }
    if (this.category?.requires_expiry && !f.expiry_date) { return 'Expiry date is required for this category'; }
    const req = this.fields.filter(x => x.required && (this.meta[x.key] === undefined || this.meta[x.key] === null || this.meta[x.key] === ''));
    if (req.length) { return 'Required fields missing: ' + req.map(x => x.label).join(', '); }
    return '';
  }

  async submit() {
    this.submitted = true;
    const msg = this.missing();
    if (msg) {
      this.common.presentToast(msg, 'warning');
      return;
    }
    const f = this.form;
    const payload: any = {
      category_id: String(f.category_id),
      title: String(f.title).trim(),
      plant_id: String(f.plant_id),
      type_id: f.type_id ? String(f.type_id) : null,
      dept_id: f.dept_id ? String(f.dept_id) : null,
      description: f.description || '',
      confidentiality: f.confidentiality || undefined,
      effective_date: f.effective_date || null,
      review_due_date: f.review_due_date || null,
      expiry_date: f.expiry_date || null,
      tags: String(f.tags || '').split(',').map((t: string) => t.trim()).filter((t: string) => !!t),
      metadata: this.meta,
      change_reason: f.change_reason || 'Initial upload'
    };
    const formData = new FormData();
    formData.append('file', this.file as File, (this.file as File).name);
    formData.append('metadata', JSON.stringify(payload));   // JSON string, nested form field nahi

    await this.common.presentLoading('Uploading...');
    try {
      const doc = await this.dms.createDocument(formData);
      this.common.presentToast('Document ' + (doc?.doc_number || '') + ' created', 'success');
      if (doc?.id) {
        this.router.navigate(['/doc-mgt/detail', doc.id], { replaceUrl: true });
      } else {
        this.navCtrl.pop();
      }
    } catch (e) {
      this.dms.showError(e);
    }
    this.common.dismissloading();
  }

}
