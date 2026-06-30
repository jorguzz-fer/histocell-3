-- Serviço gera etiqueta? (ex.: "caixa corta-lâmina" não gera). Default true
-- preserva o comportamento atual (todos etiquetam).
ALTER TABLE "Servico" ADD COLUMN "geraEtiqueta" BOOLEAN NOT NULL DEFAULT true;
