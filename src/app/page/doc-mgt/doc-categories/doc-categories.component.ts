import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DmsService } from 'src/app/provider/dms/dms.service';

@Component({
  selector: 'app-doc-categories',
  templateUrl: './doc-categories.component.html',
  styleUrls: ['./doc-categories.component.scss'],
})
export class DocCategoriesComponent implements OnInit {
  tree: any[] = [];
  loaded = false;

  constructor(
    private router: Router,
    public dms: DmsService
  ) { }

  ngOnInit() {
    this.load();
  }

  async load(ev?: any) {
    try {
      this.tree = await this.dms.categoriesTree() || [];
    } catch (e) {
      this.dms.showError(e);
    }
    this.loaded = true;
    ev?.target?.complete();
  }

  openCategory(node: any) {
    this.router.navigate(['/doc-mgt/list'], {
      queryParams: { category_id: node.category.id, latest_only: 1, title: node.category.name }
    });
  }

}
