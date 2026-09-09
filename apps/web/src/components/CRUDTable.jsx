import React, { useState } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  Plus,
  ArrowUpDown,
  Search,
  Loader2,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { tableStyles } from "@/lib/tableStyles";

const CRUDTable = ({
  columns = [],
  data = [],
  loading = false,
  pagination = { page: 1, limit: 10, total: 0, totalPages: 1 },
  onPageChange,
  onSearch,
  onSort,
  onEdit,
  onDelete,
  onCreate,
  title,
  searchPlaceholder = "Filtrar registros...",
  emptyMessage = "Nenhum registro encontrado."
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteId, setDeleteId] = useState(null);

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (onSearch) onSearch(value);
  };

  const handleSort = (column) => {
    if (onSort && column.sortable) {
      onSort(column.accessorKey);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
           {title && <h2 className="text-2xl font-bold tracking-tight text-foreground">{title}</h2>}
           {loading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={handleSearch}
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {onCreate && (
            <Button onClick={onCreate} size="sm" className="h-10 px-4 bg-blue-600 text-white hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" /> Novo
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-background overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border hover:bg-muted">
              {columns.map((col) => (
                <TableHead
                  key={col.accessorKey || col.header}
                  className={cn(
                    "text-foreground font-semibold bg-muted",
                    col.className,
                    col.sortable && "cursor-pointer select-none hover:text-foreground/80"
                  )}
                  onClick={() => handleSort(col)}
                >
                  <div className="flex items-center gap-2">
                    {col.header}
                    {col.sortable && <ArrowUpDown className="h-3 w-3 opacity-50" />}
                  </div>
                </TableHead>
              ))}
              <TableHead className="text-foreground font-semibold bg-muted w-[80px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="border-b border-border">
                   {columns.map((col, j) => (
                     <TableCell key={j} className="text-foreground">
                        <div className="h-4 w-full bg-muted animate-pulse rounded" />
                     </TableCell>
                   ))}
                   <TableCell className="text-foreground"><div className="h-8 w-8 bg-muted animate-pulse rounded-full ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow className="border-b border-border">
                <TableCell colSpan={columns.length + 1} className="text-foreground text-center py-8">
                    <div className="flex flex-col items-center justify-center">
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                          <FileText className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p>{emptyMessage}</p>
                    </div>
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow key={row.id} className="border-b border-border hover:bg-muted">
                  {columns.map((col) => (
                    <TableCell key={col.accessorKey || col.header} className={cn("text-foreground", col.className)}>
                      {col.cell ? col.cell({ row }) : row[col.accessorKey]}
                    </TableCell>
                  ))}
                  <TableCell className="text-foreground text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted text-muted-foreground">
                          <span className="sr-only">Abrir menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        {onEdit && (
                          <DropdownMenuItem onClick={() => onEdit(row)}>
                            <Pencil className="mr-2 h-4 w-4" /> Editar
                          </DropdownMenuItem>
                        )}
                        {onDelete && (
                          <DropdownMenuItem onClick={() => setDeleteId(row.id)} className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:text-red-400 dark:focus:text-red-400 dark:focus:bg-red-950/30">
                            <Trash2 className="mr-2 h-4 w-4" /> Excluir
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-2 pt-2">
          <div className="text-sm text-muted-foreground">
            Página {pagination.page} de {pagination.totalPages} ({pagination.total} registros)
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange(1)}
              disabled={pagination.page <= 1 || loading}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1 || loading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || loading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange(pagination.totalPages)}
              disabled={pagination.page >= pagination.totalPages || loading}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o registro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => {
                if (onDelete && deleteId) onDelete(deleteId);
                setDeleteId(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CRUDTable;