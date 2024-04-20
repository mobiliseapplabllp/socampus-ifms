import Dexie, { Table } from 'dexie';


export interface checklist {
  unique_id?: number,
  assign_to: string,
  barcode: string,
  checklist_cat_id: number,
  chk_cat_name: string,
  device_name: string,
  loc_id: number,
  location_desc: string,
  sch_dateTime: string,
  sch_endDateTime:  string,
  schedule_date: string,
  schedule_id: number,
  schedule_status: string,
  schedule_unique_id: string,
  offline_save: string,
  fill_date_time: string,
  qus:[{
    cat_id: number,
    critical_desc: string,
    q_desc: string,
    q_id: number,
    q_max_score: string,
    q_type: any,
    question_type: string,
    remark?: string,
    rspns?: number,
    rspns_temp: number,
    imagename?: Blob,
    options: [{
      is_doc_mandatory: number,
      is_rmrk_mandatory: number,
      optn_desc: string,
      optn_id: number,
      optn_value: string,
      q_id: number
    }],

    // q_desc?: string,
    // critical_desc?: string,
    // q_id: number,
    // q_max_score?: string,
    // q_type?: number,
    // question_type?: string,
    // remark?: string,
    // rspns?: number,
    // rspns_temp: number,
    // imagename?: Blob,
    // options: [{
    //   q_id: number,
    //   optn_id: number,
    //   optn_desc: string,
    //   is_rmrk_mandatory: number,
    //   is_doc_mandatory: number
    // }]
  }]
}

export class AppDB extends Dexie {
  checklist!: Table<checklist, number>;
  constructor() {
    super('ngdexieliveQuery');
    this.version(4).stores({
      checklist: '++unique_id,assign_to ,barcode, checklist_cat_id,chk_cat_name,device_name,loc_id,location_desc,sch_dateTime,sch_endDateTime,schedule_date,schedule_id,schedule_status,schedule_unique_id,offline_save,fill_date_time,qus'
    });
  }

  clearChecklists() {
    return db.checklist.clear();
  }
}

export const db = new AppDB();
