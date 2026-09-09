import { cn } from "@/lib/utils";

export const tableStyles = {
  // Main container
  container: "rounded-md border border-border bg-background shadow-sm overflow-hidden",

  // Header styles
  headerRow: "bg-muted hover:bg-muted border-none",
  headerCell: "h-11 px-4 text-left align-middle font-medium text-foreground [&:has([role=checkbox])]:pr-0",

  // Body styles
  row: "border-b border-border transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted even:bg-muted/30",
  cell: "p-4 align-middle [&:has([role=checkbox])]:pr-0 text-foreground font-normal text-sm",

  // Empty state - explicit theme background to prevent transparency issues causing overlay mismatches
  emptyRow: "hover:bg-transparent bg-background",
  emptyCell: "h-32 text-center align-middle text-muted-foreground font-medium",

  // Search/Filter inputs
  searchInput: "h-10 w-full pl-10 pr-4 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  searchIcon: "absolute left-3 top-3 h-4 w-4 text-muted-foreground"
};

export const getStatusBadgeClass = (status) => {
  if (!status) return "bg-muted text-foreground border-border";
  
  const normalized = String(status).toLowerCase();
  
  const styles = {
    // Green / Success
    'ativo': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    'concluído': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    'aprovado': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    'pago': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    'faturado': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    'recebido': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    
    // Blue / Info / Processing
    'em andamento': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    'enviado': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    'confirmado': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    'novo': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    
    // Yellow / Warning / Pending
    'pendente': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    'solicitado': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    'rascunho': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    'em aberto': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    
    // Red / Error / Cancelled
    'inativo': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
    'cancelado': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
    'rejeitado': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
    'atrasado': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
    
    // Default / Gray
    'default': 'bg-muted text-foreground border-border'
  };
  
  return cn("px-2.5 py-0.5 rounded-full text-xs font-medium border", styles[normalized] || styles['default']);
};