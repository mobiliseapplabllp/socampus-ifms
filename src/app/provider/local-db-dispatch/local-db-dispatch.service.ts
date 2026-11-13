import Dexie, { Table } from 'dexie';

export interface orderDispatch {
  unique_id?: number,
  order_id: number,
  txn_id: number,
  isPack: boolean,
  date: string
}

export class ord_dispatch extends Dexie {
  orderDispatch!: Table<orderDispatch, number>;
  constructor() {
    super('orderDispatchDb');
    this.version(5).stores({
      orderDispatch: '++unique_id,order_id,txn_id,isPack, date'
    });
  }

  clearChecklists() {
    return db.orderDispatch.clear();
  }
}

export const db = new ord_dispatch();
