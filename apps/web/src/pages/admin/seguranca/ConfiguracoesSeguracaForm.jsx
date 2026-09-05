import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { insertWithCompanyId } from '@/lib/companyUtils';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Loader2 } from 'lucide-react';

function RolesForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [permissions, setPermissions] = useState([]);
  const [selectedPermissions, setSelectedPermissions] = useState(new Set());
  
  const [formData, setFormData] = useState({
    nome: '',
    descricao: ''
  });

  useEffect(() => {
    fetchPermissions();
    if (id) {
      fetchRole();
    }
  }, [id]);

  const fetchPermissions = async () => {
      const { data } = await supabase.from('permissions').select('*').order('modulo');
      setPermissions(data || []);
  };

  const fetchRole = async () => {
    setLoading(true);
    try {
      const { data: role, error } = await supabase.from('roles').select('*').eq('id', id).single();
      if (error) throw error;
      setFormData({ nome: role.nome, descricao: role.descricao });
      
      const { data: perms } = await supabase.from('role_permissions').select('permission_id').eq('role_id', id);
      if (perms) {
          setSelectedPermissions(new Set(perms.map(p => p.permission_id)));
      }
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: err.message });
      navigate('/admin/roles');
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionToggle = (permId) => {
    const newSelected = new Set(selectedPermissions);
    if (newSelected.has(permId)) {
        newSelected.delete(permId);
    } else {
        newSelected.add(permId);
    }
    setSelectedPermissions(newSelected);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nome) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Nome é obrigatório.' });
        return;
    }

    setSaving(true);
    try {
        let roleId = id;
        
        // 1. Upsert Role
        if (id) {
            const { error } = await supabase.from('roles').update(formData).eq('id', id);
            if (error) throw error;
        } else {
            const { data, error } = await insertWithCompanyId('roles', formData, {
                chain: (query) => query.select().single()
            });
            if (error) throw error;
            roleId = data.id;
        }

        // 2. Sync Permissions (Delete all, then insert new)
        // This is a simple strategy. For huge datasets, diffing is better.
        if (roleId) {
             await supabase.from('role_permissions').delete().eq('role_id', roleId);
             
             const permsToInsert = Array.from(selectedPermissions).map(permId => ({
                 role_id: roleId,
                 permission_id: permId
             }));
             
             if (permsToInsert.length > 0) {
                 const { error: permError } = await insertWithCompanyId('role_permissions', permsToInsert);
                 if (permError) throw permError;
             }
        }

        toast({ title: 'Sucesso', description: 'Perfil salvo com sucesso.' });
        navigate('/admin/roles');
    } catch (err) {
        toast({ variant: 'destructive', title: 'Erro', description: err.message });
    } finally {
        setSaving(false);
    }
  };

  const groupedPermissions = permissions.reduce((acc, curr) => {
      (acc[curr.modulo] = acc[curr.modulo] || []).push(curr);
      return acc;
  }, {});

  if (loading) return <div className="flex justify-center h-screen items-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Helmet>
        <title>{id ? 'Editar' : 'Novo'} Perfil - ERP Platform</title>
      </Helmet>

      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/admin/roles')} className="mb-2">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <h1 className="text-3xl font-bold">{id ? 'Editar Perfil' : 'Novo Perfil'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
            <CardHeader><CardTitle>Dados Básicos</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label>Nome do Perfil <span className="text-red-500">*</span></Label>
                    <Input value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} required />
                </div>
                <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Textarea value={formData.descricao || ''} onChange={e => setFormData({...formData, descricao: e.target.value})} />
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader><CardTitle>Permissões</CardTitle></CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {Object.entries(groupedPermissions).map(([module, perms]) => (
                        <div key={module} className="border rounded-md p-4">
                            <h3 className="font-semibold text-lg mb-3 capitalize text-foreground">{module}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {perms.map(perm => (
                                    <div key={perm.id} className="flex items-start space-x-2">
                                        <Checkbox 
                                            id={perm.id} 
                                            checked={selectedPermissions.has(perm.id)}
                                            onCheckedChange={() => handlePermissionToggle(perm.id)}
                                        />
                                        <div className="grid gap-1.5 leading-none">
                                            <Label htmlFor={perm.id} className="cursor-pointer">{perm.nome}</Label>
                                            <p className="text-[0.8rem] text-muted-foreground">{perm.descricao}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                    {permissions.length === 0 && <p className="text-muted-foreground">Nenhuma permissão cadastrada no sistema.</p>}
                </div>
            </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate('/admin/roles')}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar Perfil</Button>
        </div>
      </form>
    </div>
  );
}

export default RolesForm;