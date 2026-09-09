import React, { useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { ShieldAlert, Lock, FileKey } from 'lucide-react';

export default function NfseConfigSecurity({ isChecked, setIsChecked }) {
  useEffect(() => {
    console.log('NfseConfigSecurity rendered');
  }, []);

  return (
    <div className="space-y-4 my-6">
      <Alert variant="default" className="bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400">
        <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        <AlertTitle className="text-amber-800 dark:text-amber-400 font-bold">Aviso de Segurança e Criptografia</AlertTitle>
        <AlertDescription className="space-y-2 mt-2">
          <p className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            Dados sensíveis serão criptografados e armazenados com segurança.
          </p>
          <p className="flex items-center gap-2">
            <FileKey className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            O Certificado .pfx será armazenado de forma segura em nosso banco de dados.
          </p>
          <p className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            A senha do certificado será fortemente criptografada antes de ser salva.
          </p>
        </AlertDescription>
      </Alert>

      <div className="flex items-center space-x-2 bg-muted p-4 rounded-lg border border-border">
        <Checkbox 
          id="security-check" 
          checked={isChecked} 
          onCheckedChange={setIsChecked} 
        />
        <label
          htmlFor="security-check"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground"
        >
          Tenho certeza que a senha e o certificado estão corretos e autorizo o armazenamento seguro destes dados.
        </label>
      </div>
    </div>
  );
}