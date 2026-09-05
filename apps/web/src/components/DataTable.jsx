import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { tableStyles } from "@/lib/tableStyles";
import { cn } from "@/lib/utils";

export function DataTable({ 
  columns, 
  data, 
  searchColumn = "nome", 
  searchPlaceholder = "Filtrar...",
  loading = false,
  emptyMessage = "Nenhum resultado encontrado"
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const safeData = Array.isArray(data) ? data : [];
  
  const filteredData = safeData.filter((item) => {
    if (!searchTerm) return true;
    const value = item[searchColumn];
    return value && String(value).toLowerCase().includes(searchTerm.toLowerCase());
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <div className="relative w-full max-w-sm">
          <Search className={cn(tableStyles.searchIcon, "text-muted-foreground")} />
          <input
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className={cn(tableStyles.searchInput, "bg-background border-input text-foreground")}
          />
        </div>
      </div>
      
      <div className={cn(tableStyles.container, "bg-card border-border")}>
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border hover:bg-muted/50">
              {columns.map((column, index) => (
                <TableHead key={column.accessorKey || index} className={cn(column.className, "text-foreground font-semibold bg-muted/50")}>
                  {column.header}
                </TableHead>
              ))}
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
                </TableRow>
              ))
            ) : paginatedData.length > 0 ? (
              paginatedData.map((row, rowIndex) => {
                const uniqueKey = row.id 
                  ? `${row.id}-${startIndex + rowIndex}` 
                  : `row-${startIndex + rowIndex}`;
                
                return (
                  <TableRow key={uniqueKey} className="border-b border-border hover:bg-muted/50">
                    {columns.map((column, colIndex) => (
                      <TableCell key={`${uniqueKey}-col-${colIndex}`} className={cn(column.className, "text-foreground p-4")}>
                        {column.cell ? column.cell({ row }) : (column.render ? column.render(row) : row[column.accessorKey || column.accessor])}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            ) : (
              <TableRow className="border-b border-border">
                <TableCell colSpan={columns.length} className="text-foreground text-center py-8">
                  <div className="flex flex-col items-center justify-center">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                      <Search className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-foreground">{emptyMessage}</p>
                    {searchTerm && <p className="text-xs mt-1 text-muted-foreground">Tente buscar por outro termo</p>}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
            <span className="text-sm text-muted-foreground">
                Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, filteredData.length)} de {filteredData.length} registros
            </span>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-sm font-medium text-foreground">
                Página {currentPage} de {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;