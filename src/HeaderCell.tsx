import { css } from '@linaria/core';

import type { CalculatedColumn, SortColumn } from './types';
import type { HeaderRowProps } from './HeaderRow';
import DefaultHeaderRenderer from './HeaderRenderer';
import { getCellStyle, getCellClassname, clampColumnWidth } from './utils';
import { useRovingCellRef } from './hooks';
import { useState } from 'react';

const cursor = `
url("data:image/svg+xml,%3Csvg width='20' height='20' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M8.53125 2.07438C8.1875 2.07829 7.91016 2.36344 7.91797 2.70719V17.2931C7.91406 17.5158 8.03125 17.7267 8.22656 17.84C8.42187 17.9533 8.66016 17.9533 8.85547 17.84C9.05078 17.7267 9.16797 17.5158 9.16797 17.2931V2.70719C9.16797 2.53922 9.10156 2.37516 8.98438 2.25797C8.86328 2.13688 8.69922 2.07047 8.53125 2.07438ZM11.4492 2.07438C11.1055 2.07829 10.8281 2.36344 10.832 2.70719V17.2931C10.832 17.5158 10.9492 17.7267 11.1445 17.84C11.3398 17.9533 11.5781 17.9533 11.7734 17.84C11.9688 17.7267 12.0859 17.5158 12.082 17.2931V2.70719C12.0859 2.53922 12.0195 2.37516 11.8984 2.25797C11.7812 2.13688 11.6172 2.07047 11.4492 2.07438ZM3.95312 7.07829C3.69922 7.07829 3.46875 7.23063 3.37109 7.46891C3.27734 7.70329 3.33203 7.97282 3.51562 8.1486L4.94922 9.58219H1.45703C1.23438 9.58219 1.02344 9.69938 0.910156 9.89469C0.796875 10.09 0.796875 10.3283 0.910156 10.5236C1.02344 10.7189 1.23438 10.8361 1.45703 10.8322H4.94922L3.51562 12.2658C3.35156 12.422 3.28906 12.6564 3.34375 12.8752C3.40234 13.0939 3.57422 13.2658 3.79297 13.3205C4.01172 13.3791 4.24219 13.3127 4.39844 13.1486L6.89844 10.6486C7.14453 10.4064 7.14453 10.0119 6.89844 9.76579L4.39844 7.26579C4.28125 7.14469 4.12109 7.07829 3.95312 7.07829ZM16.0312 7.07829C15.8672 7.08219 15.7148 7.1486 15.6016 7.26579L13.1016 9.76579C12.8555 10.0119 12.8555 10.4064 13.1016 10.6486L15.6016 13.1486C15.7578 13.3127 15.9883 13.3791 16.207 13.3205C16.4258 13.2658 16.5977 13.0939 16.6562 12.8752C16.7109 12.6564 16.6484 12.422 16.4844 12.2658L15.0508 10.8322H18.543C18.7656 10.8361 18.9766 10.7189 19.0898 10.5236C19.2031 10.3283 19.2031 10.09 19.0898 9.89469C18.9766 9.69938 18.7656 9.58219 18.543 9.58219H15.0508L16.4844 8.1486C16.668 7.96891 16.7227 7.69547 16.625 7.45719C16.5234 7.22282 16.2852 7.07048 16.0312 7.07829Z' fill='black'/%3E%3C/svg%3E%0A")
`

const cellResizable = css`
  touch-action: none;
  &::after {
    content: '';
    position: absolute;
    background: transparent;
    inset-block-start: 0;
    inset-inline-end: 0;
    inset-block-end: 0;
    inline-size: 4px;
  }

  &:active {
    cursor: ${cursor} 10 10, auto;
  }
`;

const cellResizableHovered = css`
  touch-action: none;
  &::after {
    content: '';
    background: #3ED0DD;
    transition: 300ms;
    cursor: ${cursor} 10 10, auto;
    position: absolute;
    inset-block-start: 0;
    inset-inline-end: 0;
    inset-block-end: 0;
    inline-size: 4px;
  }

  &:active {
    cursor: ${cursor} 10 10, auto;
  }
`;

const cellResizableClassname = `rdg-cell-resizable ${cellResizable}`;
const cellResizableClassnameHovered = `rdg-cell-resizable ${cellResizableHovered}`;

type SharedHeaderRowProps<R, SR> = Pick<
  HeaderRowProps<R, SR, React.Key>,
  | 'sortColumns'
  | 'onSortColumnsChange'
  | 'allRowsSelected'
  | 'onAllRowsSelectionChange'
  | 'selectCell'
  | 'onColumnResize'
  | 'shouldFocusGrid'
  | 'direction'
>;

export interface HeaderCellProps<R, SR> extends SharedHeaderRowProps<R, SR> {
  column: CalculatedColumn<R, SR>;
  colSpan: number | undefined;
  onLostResize?: (() => void) | undefined;
  isCellSelected: boolean;
}

export default function HeaderCell<R, SR>({
  column,
  colSpan,
  isCellSelected,
  onColumnResize,
  onLostResize,
  allRowsSelected,
  onAllRowsSelectionChange,
  sortColumns,
  onSortColumnsChange,
  selectCell,
  shouldFocusGrid,
  direction
}: HeaderCellProps<R, SR>) {
  const isRtl = direction === 'rtl';
  const { ref, tabIndex, onFocus } = useRovingCellRef(isCellSelected);
  const sortIndex = sortColumns?.findIndex((sort) => sort.columnKey === column.key);
  const sortColumn =
    sortIndex !== undefined && sortIndex > -1 ? sortColumns![sortIndex] : undefined;
  const sortDirection = sortColumn?.direction;
  const priority = sortColumn !== undefined && sortColumns!.length > 1 ? sortIndex! + 1 : undefined;
  const ariaSort =
    sortDirection && !priority ? (sortDirection === 'ASC' ? 'ascending' : 'descending') : undefined;
    
  const [resizeHovered, setResizeHovered] = useState(false)
  
  const className = getCellClassname(column, column.headerCellClass, {
    [cellResizableClassname]: column.resizable,
    [cellResizableClassnameHovered]: resizeHovered,
  });
  
  const HeaderRenderer = column.headerRenderer ?? DefaultHeaderRenderer;
  
  function onMouseMove(event: React.PointerEvent<HTMLDivElement>) {
    
    const { currentTarget } = event;
    const target = currentTarget.getBoundingClientRect();
    const x = event.clientX - target.left; //x position within the element.
    setResizeHovered((currentTarget.offsetWidth - x) < 10 || resizeHovered)
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse' && event.buttons !== 1) {
      return;
    }

    const { currentTarget, pointerId } = event;
    const { right, left } = currentTarget.getBoundingClientRect();
    const offset = isRtl ? event.clientX - left : right - event.clientX;

    if (offset > 11) {
      // +1px to account for the border size
      return;
    }

    function onPointerMove(event: PointerEvent) {
      const { right, left } = currentTarget.getBoundingClientRect();
      const width = isRtl ? right + offset - event.clientX : event.clientX + offset - left;
      if (width > 0) {
        onColumnResize(column, clampColumnWidth(width, column));
      }
    }

    function onLostPointerCapture() {
      onLostResize?.()
      currentTarget.removeEventListener('pointermove', onPointerMove);
      currentTarget.removeEventListener('lostpointercapture', onLostPointerCapture);
    }

    currentTarget.setPointerCapture(pointerId);
    currentTarget.addEventListener('pointermove', onPointerMove);
    currentTarget.addEventListener('lostpointercapture', onLostPointerCapture);
  }

  function onSort(ctrlClick: boolean) {
    if (onSortColumnsChange == null) return;
    const { sortDescendingFirst } = column;
    if (sortColumn === undefined) {
      // not currently sorted
      const nextSort: SortColumn = {
        columnKey: column.key,
        direction: sortDescendingFirst ? 'DESC' : 'ASC'
      };
      onSortColumnsChange(sortColumns && ctrlClick ? [...sortColumns, nextSort] : [nextSort]);
    } else {
      let nextSortColumn: SortColumn | undefined;
      if (
        (sortDescendingFirst && sortDirection === 'DESC') ||
        (!sortDescendingFirst && sortDirection === 'ASC')
      ) {
        nextSortColumn = {
          columnKey: column.key,
          direction: sortDirection === 'ASC' ? 'DESC' : 'ASC'
        };
      }
      if (ctrlClick) {
        const nextSortColumns = [...sortColumns!];
        if (nextSortColumn) {
          // swap direction
          nextSortColumns[sortIndex!] = nextSortColumn;
        } else {
          // remove sort
          nextSortColumns.splice(sortIndex!, 1);
        }
        onSortColumnsChange(nextSortColumns);
      } else {
        onSortColumnsChange(nextSortColumn ? [nextSortColumn] : []);
      }
    }
  }

  function onClick() {
    selectCell(column.idx);
  }

  function onDoubleClick(event: React.MouseEvent<HTMLDivElement>) {
    const { right, left } = event.currentTarget.getBoundingClientRect();
    const offset = isRtl ? event.clientX - left : right - event.clientX;

    if (offset > 11) {
      // +1px to account for the border size
      return;
    }

    onColumnResize(column, 'auto');
  }

  function handleFocus(event: React.FocusEvent<HTMLDivElement>) {
    onFocus(event);
    if (shouldFocusGrid) {
      // Select the first header cell if there is no selected cell
      selectCell(0);
    }
  }

  return (
    <div
      role="columnheader"
      aria-colindex={column.idx + 1}
      aria-selected={isCellSelected}
      aria-sort={ariaSort}
      aria-colspan={colSpan}
      ref={ref}
      // set the tabIndex to 0 when there is no selected cell so grid can receive focus
      tabIndex={shouldFocusGrid ? 0 : tabIndex}
      className={`${className} ${column.key === 'FROZEN_RIGHT_COLUMN' && 'RIGHT_COLUMN_FROZEN_CLASS'}`}
      style={{
        ...getCellStyle(column, colSpan),
        minWidth: column.minWidth,
        maxWidth: column.maxWidth ?? undefined
      }}
      onFocus={handleFocus}
      onClick={onClick}
      onMouseMove={onMouseMove}
      onMouseLeave={() => {
        setResizeHovered(false)
      }}
      onDoubleClick={column.resizable ? onDoubleClick : undefined}
      onPointerDown={column.resizable ? onPointerDown : undefined}
    >
      <HeaderRenderer
        column={column}
        sortDirection={sortDirection}
        priority={priority}
        onSort={onSort}
        allRowsSelected={allRowsSelected}
        onAllRowsSelectionChange={onAllRowsSelectionChange}
        isCellSelected={isCellSelected}
      />
    </div>
  );
}
