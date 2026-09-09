import React from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import {
  Settings,
  MapPin,
  Database,
  Users,
  ShieldCheck,
  Lock,
  Palette,
  ArrowRight,
  Server,
  Key,
  FileCode
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function AdminDashboard() {
  const navigate = useNavigate();

  const sections = [
    {
      title: 'Configurações Fiscais',
      description: 'Gerencie bases de dados e parâmetros do módulo fiscal.',
      icon: MapPin,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
      links: [
        { name: 'Municípios IBGE (Setup)', url: '/admin/fiscal-municipios-setup', primary: true },
        { name: 'Migração de Municípios', url: '/admin/fiscal-municipios-migration' }
      ]
    },
    {
      title: 'Banco de Dados',
      description: 'Ferramentas para manutenção e setup do banco Supabase.',
      icon: Database,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30',
      links: [
        { name: 'Testar Conexão', url: '/admin/database-test' },
        { name: 'Setup do Supabase', url: '/admin/supabase-setup' },
        { name: 'Inicializar Schema', url: '/admin/schema-initializer' }
      ]
    },
    {
      title: 'Gestão de Usuários',
      description: 'Controle de contas, times e acessos ao sistema.',
      icon: Users,
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-50 dark:bg-indigo-950/30',
      links: [
        { name: 'Lista de Usuários', url: '/admin/usuarios', primary: true },
        { name: 'Times e Grupos', url: '/admin/times' }
      ]
    },
    {
      title: 'Cargos e Permissões',
      description: 'Defina o que cada usuário pode acessar e fazer.',
      icon: ShieldCheck,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-950/30',
      links: [
        { name: 'Gerenciar Cargos', url: '/admin/roles' },
        { name: 'Permissões do Sistema', url: '/admin/permissoes' }
      ]
    },
    {
      title: 'Segurança e Auditoria',
      description: 'Monitore sessões e eventos de segurança do ERP.',
      icon: Lock,
      color: 'text-red-500',
      bgColor: 'bg-red-50 dark:bg-red-950/30',
      links: [
        { name: 'Config. de Segurança', url: '/admin/seguranca' },
        { name: 'Logs de Auditoria', url: '/admin/logs' },
        { name: 'Sessões Ativas', url: '/admin/sessoes' }
      ]
    },
    {
      title: 'Aparência e Tema',
      description: 'Personalize a interface visual da plataforma.',
      icon: Palette,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50 dark:bg-orange-950/30',
      links: [
        { name: 'Configurações de Tema', url: '/configuracoes/temas', primary: true }
      ]
    }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <Helmet>
        <title>Central de Configurações | ERP Platform</title>
      </Helmet>

      <PageHeader
        title="Central de Configurações"
        description="Acesse rapidamente todas as ferramentas de administração, setup e configuração do sistema."
        icon={Settings}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sections.map((section, idx) => (
          <Card key={idx} className="flex flex-col hover:shadow-md transition-shadow border-border">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${section.bgColor}`}>
                  <section.icon className={`w-5 h-5 ${section.color}`} />
                </div>
                <CardTitle className="text-lg">{section.title}</CardTitle>
              </div>
              <CardDescription>{section.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-3">
              {section.links.map((link, linkIdx) => (
                <div key={linkIdx} className="flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  <Link
                    to={link.url}
                    className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                  >
                    {link.name}
                  </Link>
                  {link.primary && (
                    <Badge variant="secondary" className="ml-auto text-[10px] bg-muted">Principal</Badge>
                  )}
                </div>
              ))}
            </CardContent>
            <CardFooter className="pt-4 border-t border-border bg-muted/50">
              <Button
                variant="outline"
                className="w-full bg-card hover:bg-muted"
                onClick={() => navigate(section.links[0].url)}
              >
                Acessar Seção
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}