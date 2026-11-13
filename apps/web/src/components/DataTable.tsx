import type { ReactNode } from 'react';

import styles from './DataTable.module.css';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowKey: (row: T) => string | number;
  caption?: string;
}

export function DataTable<T>({ columns, data, getRowKey, caption }: DataTableProps<T>) {
  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} scope="col" className={styles.th}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={getRowKey(row)} className={styles.tbodyTr}>
              {columns.map((col) => (
                <td key={col.key} className={styles.td}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
