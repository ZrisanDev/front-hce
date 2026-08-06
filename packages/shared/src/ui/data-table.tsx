"use client"

import * as React from "react"

import {
  columnFilteringFeature,
  columnVisibilityFeature,
  createColumnHelper,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_includesString,
  flexRender,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_text,
  tableFeatures,
  useTable,
  type ColumnDef,
  type RowData,
} from "@tanstack/react-table"

import { ArrowDown, ArrowUp, ChevronsUpDown, Search, SlidersHorizontal } from "lucide-react"

import { cn } from "../lib"
import { Button } from "./button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "./dropdown-menu"
import { Input } from "./input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table"

/**
 * Shared data table for the HCE microfrontends, built on TanStack Table v9
 * (`useTable` + explicit `tableFeatures`) and rendered with the `@hce/shared/ui`
 * Table primitives.
 *
 * Features registered for every instance: sorting (client-side), global search,
 * client-side pagination, and column visibility.
 *
 * ```tsx
 * import { createDataTableColumnHelper, DataTable } from "@hce/shared/ui"
 *
 * const helper = createDataTableColumnHelper<Producto>()
 * const columns = helper.columns([
 *   helper.accessor("nombre", { header: "Nombre" }),
 *   helper.accessor("precio", { header: "Precio" }),
 * ])
 *
 * <DataTable columns={columns} data={productos} searchPlaceholder="Buscar..." />
 * ```
 *
 * NOTES:
 * - Keep `columns` and `data` references stable (module scope, `useMemo`, or a
 *   query result). A fresh array every render invalidates the row models.
 * - `pageSize` is the *initial* page size; the user can change it at runtime.
 * - Column defs can opt out of global search with `enableGlobalFilter: false`
 *   and out of the visibility menu with `enableHiding: false`.
 */
export const dataTableFeatures = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
  filterFns: { includesString: filterFn_includesString },
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text },
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
  columnVisibilityFeature,
})

/**
 * Column helper bound to the shared features, so MFs author columns without
 * importing TanStack Table directly:
 *
 * ```tsx
 * const helper = createDataTableColumnHelper<Producto>()
 * ```
 */
export const createDataTableColumnHelper = <TData extends RowData>() =>
  createColumnHelper<typeof dataTableFeatures, TData>()

// TValue is deliberately `any`: a column array mixes per-column value types and
// TanStack's own `createColumnHelper.columns()` types it this way (and it is
// assignable to the `unknown` value slot `useTable` expects).
type DataTableColumn<TData extends RowData> = ColumnDef<
  typeof dataTableFeatures,
  TData,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any
>

export interface DataTableProps<TData extends RowData> {
  columns: DataTableColumn<TData>[]
  data: TData[]
  /** Initial page size. Defaults to 10. */
  pageSize?: number
  /** Page size options shown in the pagination select. Defaults to [10, 20, 30, 40, 50]. */
  pageSizeOptions?: number[]
  showPagination?: boolean
  enableColumnVisibility?: boolean
  /** When set, renders a global search input bound to `globalFilter`. */
  searchPlaceholder?: string
  /** Extra controls rendered next to the search input (before the column visibility menu). */
  toolbar?: React.ReactNode
  emptyMessage?: string
  onRowClick?: (row: TData) => void
  className?: string
}

export function DataTable<TData extends RowData>({
  columns,
  data,
  pageSize = 10,
  pageSizeOptions = [10, 20, 30, 40, 50],
  showPagination = true,
  enableColumnVisibility = true,
  searchPlaceholder,
  toolbar,
  emptyMessage = "No results.",
  onRowClick,
  className,
}: DataTableProps<TData>) {
  const table = useTable({
    features: dataTableFeatures,
    columns,
    data,
    initialState: {
      pagination: { pageIndex: 0, pageSize },
    },
    globalFilterFn: "includesString",
    autoResetPageIndex: false,
  })

  const { pagination } = table.state
  const totalRows = table.getRowCount()
  const firstRow = totalRows === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1
  const lastRow = Math.min((pagination.pageIndex + 1) * pagination.pageSize, totalRows)
  const pageCount = Math.max(1, table.getPageCount())

  const hasToolbar = Boolean(searchPlaceholder || toolbar || enableColumnVisibility)

  return (
    <div className={cn("space-y-4", className)}>
      {hasToolbar && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            {searchPlaceholder && (
              <div className="relative w-full max-w-sm">
                <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={String(table.state.globalFilter ?? "")}
                  onChange={(event) => table.setGlobalFilter(event.target.value)}
                  placeholder={searchPlaceholder}
                  className="pl-8"
                />
              </div>
            )}
            {toolbar}
          </div>
          {enableColumnVisibility && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" size="sm" className="gap-1">
                    <SlidersHorizontal />
                    Columns
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                {table
                  .getAllLeafColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      checked={column.getIsVisible()}
                      onCheckedChange={(checked) => column.toggleVisibility(checked)}
                      className="capitalize"
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const headerContent =
                    flexRender(header.column.columnDef.header, header.getContext()) ??
                    header.column.id

                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : canSort ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-3 h-7"
                          onClick={() =>
                            header.column.toggleSorting(
                              header.column.getIsSorted() === "asc"
                            )
                          }
                        >
                          {headerContent}
                          {header.column.getIsSorted() === "desc" ? (
                            <ArrowDown />
                          ) : header.column.getIsSorted() === "asc" ? (
                            <ArrowUp />
                          ) : (
                            <ChevronsUpDown />
                          )}
                        </Button>
                      ) : (
                        headerContent
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(onRowClick && "cursor-pointer")}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {showPagination && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm text-muted-foreground">
            {totalRows === 0
              ? "0 rows"
              : `Showing ${firstRow}–${lastRow} of ${totalRows}`}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={String(pagination.pageSize)}
              onValueChange={(value) => table.setPageSize(Number(value))}
            >
              <SelectTrigger size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size} per page
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              {pagination.pageIndex + 1} / {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
