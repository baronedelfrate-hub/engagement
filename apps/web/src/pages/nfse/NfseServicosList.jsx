import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { nfseService } from '@/lib/nfseService';
import { Plus, Edit } from 'lucide-react';

const NfseServicosList = () => {
    const [services, setServices] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentService, setCurrentService] = useState({});

    useEffect(() => {
        loadServices();
    }, []);

    const loadServices = () => {
        setServices(nfseService.getServices());
    };

    const handleSave = () => {
        nfseService.saveService(currentService);
        setIsModalOpen(false);
        loadServices();
        setCurrentService({});
    };

    const openEdit = (service) => {
        setCurrentService(service);
        setIsModalOpen(true);
    };

    const openNew = () => {
        setCurrentService({
            id: null,
            nome: '',
            codigo_servico: '',
            cnae: '',
            aliquota_iss: 2.0,
            tipo_servico: 'consultoria'
        });
        setIsModalOpen(true);
    };

    return (
        <div className="p-8 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Catálogo de Serviços NFS-e</h1>
                <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Novo Serviço</Button>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>Código</TableHead>
                                <TableHead>CNAE</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Aliq. ISS</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {services.map(s => (
                                <TableRow key={s.id}>
                                    <TableCell className="font-medium">{s.nome}</TableCell>
                                    <TableCell>{s.codigo_servico}</TableCell>
                                    <TableCell>{s.cnae}</TableCell>
                                    <TableCell className="capitalize">{s.tipo_servico}</TableCell>
                                    <TableCell>{s.aliquota_iss}%</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" onClick={() => openEdit(s)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{currentService.id ? 'Editar Serviço' : 'Novo Serviço'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Nome</Label>
                            <Input value={currentService.nome} onChange={e => setCurrentService({...currentService, nome: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Código Serviço</Label>
                                <Input value={currentService.codigo_servico} onChange={e => setCurrentService({...currentService, codigo_servico: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                                <Label>CNAE</Label>
                                <Input value={currentService.cnae} onChange={e => setCurrentService({...currentService, cnae: e.target.value})} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Tipo</Label>
                                <Select value={currentService.tipo_servico} onValueChange={v => setCurrentService({...currentService, tipo_servico: v})}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="consultoria">Consultoria</SelectItem>
                                        <SelectItem value="bpo">BPO</SelectItem>
                                        <SelectItem value="treinamento">Treinamento</SelectItem>
                                        <SelectItem value="outro">Outro</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Alíquota ISS (%)</Label>
                                <Input type="number" value={currentService.aliquota_iss} onChange={e => setCurrentService({...currentService, aliquota_iss: e.target.value})} />
                            </div>
                        </div>
                        <Button onClick={handleSave} className="w-full">Salvar</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default NfseServicosList;