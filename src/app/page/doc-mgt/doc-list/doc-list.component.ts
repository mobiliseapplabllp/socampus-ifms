import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DmsService } from 'src/app/provider/dms/dms.service';

// Ek hi screen: browse, search, My documents, Recent aur Favourites
@Component({
  selector: 'app-doc-list',
  templateUrl: './doc-list.component.html',
  styleUrls: ['./doc-list.component.scss'],
})
export class DocListComponent implements OnInit {
  title = 'Documents';
  mode = '';            // '' | 'recent' | 'favourites' (ye dono paged nahi hain)
  filters: any = {};
  searchVal = '';
  documents: any[] = [];
  total = 0;
  page = 1;
  canLoadData = false;
  loaded = false;
  loading = false;     // pehli baar aur search par skeleton; pull-to-refresh par nahi

  constructor(
    private activeRoute: ActivatedRoute,
    private router: Router,
    public dms: DmsService
  ) { }

  ngOnInit() {
    const { title, mode, focus, ...filters } = this.activeRoute.snapshot.queryParams as any;
    this.title = title || 'Documents';
    this.mode = mode || '';
    this.filters = filters;
    this.searchVal = filters.q || '';
  }

  ionViewWillEnter() {
    this.reload();
  }

  async reload(ev?: any) {
    this.loading = !ev;
    if (this.loading) {
      this.documents = [];
    }
    try {
      await this.dms.init();
      this.page = 1;
      await this.load(true);
    } catch (e) {
      this.dms.showError(e);
    }
    this.loaded = true;
    this.loading = false;
    ev?.target?.complete();
  }

  async load(reset = false) {
    if (this.mode === 'recent' || this.mode === 'favourites') {
      const rows = (this.mode === 'recent' ? await this.dms.recent() : await this.dms.favourites()) || [];
      const val = this.searchVal.toLowerCase();
      this.documents = rows.filter((r: any) => !val || (r.title + ' ' + r.doc_number).toLowerCase().includes(val));
      this.total = this.documents.length;
      this.canLoadData = false;
      return;
    }
    const res = await this.dms.documents({ ...this.filters, q: this.searchVal, page: this.page, limit: 20 });
    const rows = res?.data || [];
    this.documents = reset ? rows : [...this.documents, ...rows];
    this.total = res?.total || this.documents.length;
    this.canLoadData = (res?.current_page || 1) < (res?.last_page || 1);
    if (this.canLoadData) {
      this.page++;
    }
  }

  search(ev: any) {
    this.searchVal = String(ev.target.value || '').trim();
    this.reload();
  }

  async infiniteScroll(ev: any) {
    try {
      await this.load();
    } catch (e) {
      this.dms.showError(e);
    }
    ev.target.complete();
  }

  openDetail(dat: any) {
    this.router.navigate(['/doc-mgt/detail', dat.id]);
  }

}
