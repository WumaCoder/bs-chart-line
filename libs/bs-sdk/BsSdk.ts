import {
  IEventCbCtx,
  bitable,
  Selection,
  ITable,
  IField,
} from "@lark-base-open/js-sdk";
import { Emitter } from "./Emitter";

export type SelectionChangeEmitter = (event: IEventCbCtx<Selection>) => any;
export type InitEmitter = (sdk: BsSdk) => any;

export interface BIField extends IField {
  name: string;
}

export class BsSdk {
  public readonly bitable = bitable;
  public readonly base = bitable.base;
  public activeTable: ITable | undefined;
  // public readonly initEmitter = new Emitter<InitEmitter>();
  public readonly selectionChangeEmitter =
    new Emitter<SelectionChangeEmitter>();

  constructor({
    onSelectionChange = false,
    immediatelySelectionChange = true,
  } = {}) {
    if (onSelectionChange) {
      this.base.onSelectionChange(async (event) => {
        this.activeTable = undefined;
        this.selectionChangeEmitter.emitLifeCycle(event);
      });
    }
    if (immediatelySelectionChange && onSelectionChange) {
      this.getSelection().then((selection) => {
        this.selectionChangeEmitter.emitSync({ data: selection });
      });
    }
  }

  async getRecordIds(table?: ITable) {
    if (!table) table = await this.getActiveTable();
    return await table.getRecordIdList();
  }

  async getRecordById(table: ITable, recordId: string) {
    return await table.getRecordById(recordId);
  }

  async getActiveTable() {
    if (this.activeTable) return this.activeTable;
    this.activeTable = await bitable.base.getActiveTable();
    return this.activeTable;
  }

  async getTableList() {
    return await bitable.base.getTableList();
  }

  async getFieldList(table: ITable) {
    const fieldList: BIField[] = await table.getFieldList();
    for (let i = 0; i < fieldList.length; i++) {
      const field = fieldList[i];
      field.name = await field.getName();
    }
    return fieldList;
  }

  async getSelection(): Promise<Selection> {
    return await bitable.base.getSelection();
  }

  async getSelectionQuery(selection: Partial<Selection>) {
    const table = selection.tableId
      ? await this.base.getTableById(selection.tableId)
      : undefined;
    const result = {
      table: table,
      view: selection.viewId
        ? await table?.getViewById(selection.viewId)
        : undefined,
      field: selection.fieldId
        ? await table?.getFieldById(selection.fieldId)
        : undefined,
      record: selection.recordId
        ? await table?.getRecordById(selection.recordId)
        : undefined,
    };
    return result;
  }

  async getSelection2({
    viewId = false,
    fieldId = false,
    recordId = false,
  } = {}) {
    const selection = await this.getSelection();
    return await this.getSelectionQuery({
      viewId: viewId ? selection.viewId : undefined,
      fieldId: fieldId ? selection.fieldId : undefined,
      recordId: recordId ? selection.recordId : undefined,
    });
  }
}
