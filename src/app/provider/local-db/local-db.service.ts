import Dexie, { Table } from 'dexie';

export interface checklist {
  unique_id?: number,
  schedule_id: number,
  schedule_unique_id: string,
  schedule_status: string,
  schedule_date: string,
  chk_cat_name: string,
  device_name: string,
  location_desc: string,
  barcode: string,
  backgroundColor: string,
  qus:[{
    q_desc?: string,
    critical_desc?: string,
    q_id: number,
    q_max_score?: string,
    q_type?: number,
    question_type?: string,
    remark?: string,
    rspns?: number,
    rspns_temp: number,
    imagename?: Blob,
    options: [{
      q_id: number,
      optn_id: number,
      optn_desc: string,
      is_rmrk_mandatory: number,
      is_doc_mandatory: number
    }]
  }]
}

export class AppDB extends Dexie {
  checklist!: Table<checklist, number>;
  constructor() {
    super('ngdexieliveQuery');
    this.version(4).stores({
      checklist: '++unique_id, schedule_id, schedule_unique_id,schedule_status, schedule_date, chk_cat_name, device_name,location_desc, barcode, backgroundColor, qus'
    });
  }

  clearChecklists() {
    return db.checklist.clear();
  }
}



export const db = new AppDB();
