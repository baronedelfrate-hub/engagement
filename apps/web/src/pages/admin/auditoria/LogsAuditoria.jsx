import React, { useState, useEffect } from 'react';
import { erpServices } from '@/lib/erpServices';
import CRUDTable from '@/components/CRUDTable';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

const LogsAuditoria = () => {
  const { toast } = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });

  const fetchData = async (page = 1) => {
    setLoading(true);
    const res = await erpServices.auditLogs.list({ page, limit: 20, sortBy: 'created_at', sortOrder: 'desc' });
    if (res.success) {
      setData(res.data);
      setPagination({ page: res.page, limit: res.limit, total: res.total, totalPages: res.totalPages });
    } else {
      toast({ title: 'Erro', description: res.error, variant: 'destructive' });
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const columns = [
    { header: 'Data/Hora', accessorKey: 'created_at', cell: ({ row }) => new Date(row.created_at).toLocaleString() },
    { header: 'Usuário', accessorKey: 'user_id' }, // Ideally join with user name
    { 
        header: 'Ação', 
        accessorKey: 'action',
        cell: ({ row }) => {
            const colors = { 'CREATE': 'success', 'UPDATE': 'warning', 'DELETE': 'destructive' };
            return <Badge variant={colors[row.action] || 'outline'}>{row.action}</Badge>;
        }
    },
    { header: 'Entidade', accessorKey: 'entity' },
    { header: 'Detalhes', accessorKey: 'details', cell: ({ row }) => <span className="text-xs truncate max-w-[200px] block" title={JSON.stringify(row.details)}>{JSON.stringify(row.details)}</span> },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-end mb-4">
          <Button variant="outline" onClick={() => toast({ title: 'Exportar', description: 'Exportando logs...' })}>
              <Download className="mr-2 h-4 w-4" /> Exportar Excel
          </Button>
      </div>
      <CRUDTable
        title="Logs de Auditoria"
        columns={columns}
        data={data}
        loading={loading}
        pagination={pagination}
        onPageChange={fetchData}
        // No create/edit/delete for audit logs
      />
    </div>
  );
};

export default LogsAuditoria;