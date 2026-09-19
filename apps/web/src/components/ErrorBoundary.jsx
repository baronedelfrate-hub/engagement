import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Contém erros de renderização de uma página para que o menu e o restante do
// app continuem funcionando. Reinicia sozinho quando resetKey muda (troca de rota).
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { erro: null };
  }

  static getDerivedStateFromError(erro) {
    return { erro };
  }

  componentDidCatch(erro, info) {
    console.error('Erro de renderização capturado:', erro, info?.componentStack);
  }

  componentDidUpdate(prevProps) {
    if (this.state.erro && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ erro: null });
    }
  }

  render() {
    if (!this.state.erro) return this.props.children;

    return (
      <div className="p-6 max-w-xl mx-auto mt-12 text-center space-y-4">
        <AlertTriangle className="h-10 w-10 mx-auto text-amber-500" />
        <h2 className="text-xl font-semibold text-foreground">Não foi possível exibir esta tela</h2>
        <p className="text-sm text-muted-foreground">
          Ocorreu um erro inesperado. Você pode continuar usando o menu ou tentar novamente.
        </p>
        <Button onClick={() => this.setState({ erro: null })}>Tentar novamente</Button>
      </div>
    );
  }
}
