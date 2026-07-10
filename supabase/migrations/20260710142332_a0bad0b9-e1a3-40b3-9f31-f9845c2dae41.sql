
CREATE TABLE public.produtos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  valor_compra NUMERIC NOT NULL DEFAULT 0,
  valor_venda NUMERIC NOT NULL DEFAULT 0,
  data_compra DATE,
  data_venda DATE,
  quantidade_comprada INTEGER NOT NULL DEFAULT 0,
  quantidade_vendida INTEGER NOT NULL DEFAULT 0,
  quantidade_estoque INTEGER NOT NULL DEFAULT 0,
  categoria TEXT,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.produtos TO anon, authenticated;
GRANT ALL ON public.produtos TO service_role;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public full access produtos" ON public.produtos FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.historico_vendas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente TEXT NOT NULL,
  placa TEXT,
  marca_moto TEXT,
  cor_moto TEXT,
  tipo_servico TEXT,
  produtos JSONB NOT NULL DEFAULT '[]'::jsonb,
  valor_produtos NUMERIC NOT NULL DEFAULT 0,
  valor_servico NUMERIC NOT NULL DEFAULT 0,
  valor_total NUMERIC NOT NULL DEFAULT 0,
  forma_pagamento TEXT,
  status TEXT NOT NULL DEFAULT 'Pago',
  data_servico DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.historico_vendas TO anon, authenticated;
GRANT ALL ON public.historico_vendas TO service_role;
ALTER TABLE public.historico_vendas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public full access historico" ON public.historico_vendas FOR ALL USING (true) WITH CHECK (true);
