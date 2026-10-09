import React from 'react';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { nomeDoModulo } from '@/lib/modulos';

const ModuloNaoContratado = ({ chave }) => (
  <div className="flex flex-col items-center justify-center text-center py-24 px-6">
    <div className="rounded-full bg-muted p-5 mb-5"><Lock className="h-10 w-10 text-muted-foreground" /></div>
    <h2 className="text-2xl font-semibold text-foreground mb-2">Módulo não contratado</h2>
    <p className="text-muted-foreground max-w-md mb-6">
      O módulo <strong>{nomeDoModulo(chave)}</strong> não está habilitado para a sua empresa. Para usá-lo, fale com o responsável pelo seu contrato.
    </p>
    <Button asChild><Link to="/">Voltar ao início</Link></Button>
  </div>
);

export default ModuloNaoContratado;
