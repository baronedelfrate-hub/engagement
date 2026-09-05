export const FEBRABAN_BANKS = [
  { code: '001', name: 'Banco do Brasil S.A.', abbreviation: 'BB' },
  { code: '033', name: 'Banco Santander (Brasil) S.A.', abbreviation: 'Santander' },
  { code: '104', name: 'Caixa Econômica Federal', abbreviation: 'Caixa' },
  { code: '237', name: 'Banco Bradesco S.A.', abbreviation: 'Bradesco' },
  { code: '341', name: 'Itaú Unibanco S.A.', abbreviation: 'Itaú' },
  { code: '077', name: 'Banco Inter S.A.', abbreviation: 'Inter' },
  { code: '260', name: 'Nu Pagamentos S.A.', abbreviation: 'Nubank' },
  { code: '336', name: 'Banco C6 S.A.', abbreviation: 'C6 Bank' },
  { code: '079', name: 'Banco Original S.A.', abbreviation: 'Original' },
  { code: '212', name: 'Banco Original do Agronegócio S.A.', abbreviation: 'Original Agro' },
  { code: '422', name: 'Banco Safra S.A.', abbreviation: 'Safra' },
  { code: '655', name: 'Banco Votorantim S.A.', abbreviation: 'Votorantim' },
  { code: '180', name: 'Banco BTG Pactual S.A.', abbreviation: 'BTG Pactual' },
  { code: '218', name: 'Banco BS2 S.A.', abbreviation: 'BS2' },
  { code: '637', name: 'Banco Sofisa S.A.', abbreviation: 'Sofisa' },
  { code: '041', name: 'Banco do Estado do Rio Grande do Sul S.A.', abbreviation: 'Banrisul' },
  { code: '021', name: 'BANESTES S.A. Banco do Estado do Espírito Santo', abbreviation: 'Banestes' },
  { code: '756', name: 'Banco Cooperativo do Brasil S.A. - BANCOOB', abbreviation: 'Sicoob' },
  { code: '748', name: 'Banco Cooperativo Sicredi S.A.', abbreviation: 'Sicredi' },
  { code: '208', name: 'Banco BTG Pactual S.A.', abbreviation: 'BTG Pactual' }, // Sometimes listed with different codes for different entities
  { code: '290', name: 'PagSeguro Internet S.A.', abbreviation: 'PagBank' },
  { code: '323', name: 'Mercado Pago - Conta do Mercado Livre', abbreviation: 'Mercado Pago' },
  { code: '380', name: 'PicPay Serviços S.A.', abbreviation: 'PicPay' },
  { code: '623', name: 'Banco Pan S.A.', abbreviation: 'Pan' },
  { code: '707', name: 'Banco Daycoval S.A.', abbreviation: 'Daycoval' },
  { code: '477', name: 'Citibank N.A.', abbreviation: 'Citibank' }
];

export const getBankName = (code) => {
  if (!code) return 'N/A';
  const bank = FEBRABAN_BANKS.find(b => b.code === code);
  return bank ? `${bank.abbreviation || bank.name} (${bank.code})` : code;
};