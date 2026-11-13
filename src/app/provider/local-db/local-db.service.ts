import Dexie, { Table } from 'dexie';
export interface checklist {
  schedule_id: any,
  offline_save: any
}

// export interface checklist {
//   unique_id?: number,
//   assign_to: string,
//   barcode: string,
//   checklist_cat_id: number,
//   chk_cat_name: string,
//   device_name: string,
//   loc_id: number,
//   location_desc: string,
//   sch_dateTime: string,
//   sch_endDateTime:  string,
//   schedule_date: string,
//   schedule_id: number,
//   ticket_id: number,
//   raised_cust: string,
//   pc_id: any,
//   schedule_status: string,
//   schedule_unique_id: string,
//   offline_save: string,
//   fill_date_time: string,
//   qus:[{
//     cat_id: number,
//     critical_desc: string,
//     q_desc: string,
//     q_id: number,
//     q_max_score: string,
//     q_type: any,
//     question_type: string,
//     remark?: string,
//     rspns?: number,
//     rspns_temp: number,
//     imagename?: Blob,
//     options: [{
//       is_doc_mandatory: number,
//       is_rmrk_mandatory: number,
//       optn_desc: string,
//       optn_id: number,
//       optn_value: string,
//       q_id: number
//     }],
//   }]
// }

export class AppDB extends Dexie {
  checklist!: Table<checklist, number>;
  constructor() {
    super('ngdexieliveQuery_v2');
    this.version(11).stores({
      checklist: '++unique_id, schedule_id, schedule_date, offline_save, [schedule_date+assign_to]'
    });
    // schedule_id becomes the primary key so that repeated syncs upsert the same row
    // instead of inserting duplicates. Existing rows are dropped on upgrade (data is
    // daily/temporary and the next sync repopulates) — this also avoids a
    // ConstraintError that Dexie's default copy migration would hit for users whose
    // v11 table currently contains duplicate schedule_id values.
    this.version(12).stores({
      checklist: 'schedule_id, schedule_date, offline_save, [schedule_date+assign_to]'
    }).upgrade(async tx => {
      await tx.table('checklist').clear();
    });
  }

  clearChecklists() {
    return db.checklist.clear();
  }
}

export const db = new AppDB();
