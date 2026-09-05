import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Plus, Edit, Ban, AlertCircle } from 'lucide-react';
import { 
  listarUsuarios, 
  buscarTodasEmpresas, 
  buscarEmpresa,
  desativarUsuario 
} from '@/services/admin/usuariosService';

const UsuariosList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [filterProfile, setFilterProfile] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [fetchedUsers, fetchedCompanies] = await Promise.all([
        listarUsuarios(),
        buscarTodasEmpresas()
      ]);

      // Resolve company names for each user
      const usersWithCompanies = await Promise.all(fetchedUsers.map(async (u) => {
        try {
          const emp = await buscarEmpresa(u.company_id);
          return { ...u, company_name: emp.nome };
        } catch {
          return { ...u, company_name: 'Desconhecida' };
        }
      }));

      setUsers(usersWithCompanies);
      setCompanies(fetchedCompanies);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar a lista de usuários. Verifique as permissões de admin."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDesativar = async (userId) => {
    try {
      await desativarUsuario(userId);
      toast({
        title: "Usuário Desativado",
        description: "O acesso do usuário foi revogado com sucesso.",
      });
      fetchData();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao desativar",
        description: error.message,
      });
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.nome.toLowerCase().includes(search.toLowerCase()) || 
                          u.email.toLowerCase().includes(search.toLowerCase());
    const matchesCompany = filterCompany && filterCompany !== 'all' ? u.company_id === filterCompany : true;
    const matchesProfile = filterProfile && filterProfile !== 'all' ? u.role === filterProfile : true;
    
    // Hide banned users by default in active view unless we want to show them
    const isActive = !u.banned_until;
    
    return matchesSearch && matchesCompany && matchesProfile && isActive;
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-card p-4 rounded-xl border shadow-sm">
        <div className="flex flex-1 items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou e-mail..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <Select value={filterCompany} onValueChange={setFilterCompany}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Todas as Empresas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Empresas</SelectItem>
              {companies.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={filterProfile} onValueChange={setFilterProfile}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Todos os Perfis" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Perfis</SelectItem>
              <SelectItem value="admin">Administrador</SelectItem>
              <SelectItem value="user">Usuário</SelectItem>
              <SelectItem value="viewer">Visualizador</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={() => navigate('/admin/usuarios/novo')} className="w-full sm:w-auto gap-2">
          <Plus className="h-4 w-4" /> Novo Usuário
        </Button>
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <TableRow key={idx}>
                  <TableCell><Skeleton className="h-5 w-[150px]" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-[200px]" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-[120px]" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-[100px]" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-[100px] ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : paginatedUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <AlertCircle className="h-8 w-8 text-muted-foreground/50" />
                    <p>Nenhum usuário encontrado com os filtros atuais.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.nome}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.company_name}</TableCell>
                  <TableCell className="capitalize">{user.role}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate(`/admin/usuarios/${user.id}`)}
                      >
                        <Edit className="h-4 w-4 mr-1" /> Editar
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Ban className="h-4 w-4 mr-1" /> Desativar
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Desativar Usuário</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja desativar o acesso de <strong>{user.nome}</strong>? 
                              O usuário não poderá mais realizar login na plataforma.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDesativar(user.id)}
                              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                            >
                              Desativar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-between items-center bg-card p-4 rounded-xl border shadow-sm">
          <p className="text-sm text-muted-foreground">
            Mostrando {(page - 1) * itemsPerPage + 1} até {Math.min(page * itemsPerPage, filteredUsers.length)} de {filteredUsers.length}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsuariosList;