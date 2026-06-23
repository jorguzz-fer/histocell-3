-- ============================================================
-- Nomeia Colorações Específicas + Insumos/Materiais (1x só).
-- Rode no container do Postgres:
--   psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f nomear-servicos.sql
-- ou cole o conteúdo dentro do psql.
-- ============================================================

-- ===== Colorações Específicas =====
-- Nomeia as Colorações Específicas (match por codigoLegado).

UPDATE "Servico" SET nome='Despigmentação' WHERE "codigoLegado"=24;
UPDATE "Servico" SET nome='Alcian Blue' WHERE "codigoLegado"=25;
UPDATE "Servico" SET nome='Fontana Masson' WHERE "codigoLegado"=26;
UPDATE "Servico" SET nome='Giemsa' WHERE "codigoLegado"=27;
UPDATE "Servico" SET nome='Gram BH/BB' WHERE "codigoLegado"=28;
UPDATE "Servico" SET nome='Grocott' WHERE "codigoLegado"=29;
UPDATE "Servico" SET nome='Mucicarmin' WHERE "codigoLegado"=30;
UPDATE "Servico" SET nome='Pams' WHERE "codigoLegado"=31;
UPDATE "Servico" SET nome='PAS' WHERE "codigoLegado"=32;
UPDATE "Servico" SET nome='Pas c Alcian Blue' WHERE "codigoLegado"=33;
UPDATE "Servico" SET nome='Pas c/Diastase' WHERE "codigoLegado"=34;
UPDATE "Servico" SET nome='Pelrs (Azul da Prússia)' WHERE "codigoLegado"=35;
UPDATE "Servico" SET nome='Picrossírius' WHERE "codigoLegado"=36;
UPDATE "Servico" SET nome='Reticulina' WHERE "codigoLegado"=37;
UPDATE "Servico" SET nome='Rodanina' WHERE "codigoLegado"=38;
UPDATE "Servico" SET nome='Sudan Black' WHERE "codigoLegado"=39;
UPDATE "Servico" SET nome='Tricômico de Masson' WHERE "codigoLegado"=40;
UPDATE "Servico" SET nome='Verhoeff' WHERE "codigoLegado"=41;
UPDATE "Servico" SET nome='Vermelho Congo' WHERE "codigoLegado"=42;
UPDATE "Servico" SET nome='Von Kossa' WHERE "codigoLegado"=43;
UPDATE "Servico" SET nome='Ziehl Nilsen' WHERE "codigoLegado"=44;
UPDATE "Servico" SET nome='Azul de Toluidina' WHERE "codigoLegado"=59;
UPDATE "Servico" SET nome='Resorcina' WHERE "codigoLegado"=78;
UPDATE "Servico" SET nome='colorações - Diversas' WHERE "codigoLegado"=122;
UPDATE "Servico" SET nome='Ferro Coloidal' WHERE "codigoLegado"=148;
UPDATE "Servico" SET nome='Coloração de Luna' WHERE "codigoLegado"=175;
UPDATE "Servico" SET nome='Prata de Jones' WHERE "codigoLegado"=195;
UPDATE "Servico" SET nome='Coloração específica trazendo lamina T. Masson' WHERE "codigoLegado"=292;
UPDATE "Servico" SET nome='Alcian Blue com Pas' WHERE "codigoLegado"=299;
UPDATE "Servico" SET nome='Sudan Black trazendo lamina' WHERE "codigoLegado"=316;
UPDATE "Servico" SET nome='Violeta Cresil c Corante cliente' WHERE "codigoLegado"=381;
UPDATE "Servico" SET nome='Tricomico de Masson fornecendo lamina c corte' WHERE "codigoLegado"=382;
UPDATE "Servico" SET nome='Sudan + Az Toluidina' WHERE "codigoLegado"=655;
UPDATE "Servico" SET nome='Oil Red' WHERE "codigoLegado"=713;
UPDATE "Servico" SET nome='Alzarin Red' WHERE "codigoLegado"=776;
UPDATE "Servico" SET nome='Gomori' WHERE "codigoLegado"=834;
UPDATE "Servico" SET nome='Azul de metileno' WHERE "codigoLegado"=835;
UPDATE "Servico" SET nome='Warthin Starry' WHERE "codigoLegado"=845;
UPDATE "Servico" SET nome='Safranina' WHERE "codigoLegado"=903;
UPDATE "Servico" SET nome='HE com Alcian Blue' WHERE "codigoLegado"=932;
UPDATE "Servico" SET variante1='Contra-corado com hematoxilina', variante2='Não Contra-corado' WHERE "codigoLegado"=36;

-- ===== Insumos / Materiais =====
-- Nomeia os Insumos/Materiais (match por codigoLegado).

UPDATE "Servico" SET nome='Caixa porta lâminas 50 Unidades', variante1='Cx' WHERE "codigoLegado"=46;
UPDATE "Servico" SET nome='Caixa porta lâmina 25 unidades', variante1='Cx' WHERE "codigoLegado"=47;
UPDATE "Servico" SET nome='Caixa porta lâmina 100 unidades', variante1='Cx' WHERE "codigoLegado"=48;
UPDATE "Servico" SET nome='Cassetes histológicos - 500 Un.', variante1='Pct' WHERE "codigoLegado"=50;
UPDATE "Servico" SET nome='Cassetes Histológicos - 100 und', variante1='Pct' WHERE "codigoLegado"=67;
UPDATE "Servico" SET nome='Descalcificador 500ML', variante1='ML' WHERE "codigoLegado"=68;
UPDATE "Servico" SET nome='Cassetes Histológicos - 250 Und', variante1='Pct' WHERE "codigoLegado"=82;
UPDATE "Servico" SET nome='Hematoxilina Harris 500ml', variante1='ML' WHERE "codigoLegado"=91;
UPDATE "Servico" SET nome='Eosina 500ml', variante1='ML' WHERE "codigoLegado"=92;
UPDATE "Servico" SET nome='Formol 10% 50ml', variante1='ML' WHERE "codigoLegado"=97;
UPDATE "Servico" SET nome='Formol 10% 1L', variante1='ML' WHERE "codigoLegado"=98;
UPDATE "Servico" SET nome='Frasco de formol com 50 ml', variante1='ML' WHERE "codigoLegado"=107;
UPDATE "Servico" SET nome='Cx. com 50 un.de laminas Silanizadas', variante1='Cx' WHERE "codigoLegado"=112;
UPDATE "Servico" SET nome='FORMOL 37%', variante1='ML' WHERE "codigoLegado"=135;
UPDATE "Servico" SET nome='Cx. de lâmina Lapidada Fosca com 50 Un', variante1='Cx' WHERE "codigoLegado"=137;
UPDATE "Servico" SET nome='Cx. de lâmina polarizada com 70 un.', variante1='Cx' WHERE "codigoLegado"=142;
UPDATE "Servico" SET nome='Cx. de Lamínula 24x32', variante1='Cx' WHERE "codigoLegado"=143;
UPDATE "Servico" SET nome='Cx. de Lamínula 24x40', variante1='Cx' WHERE "codigoLegado"=144;
UPDATE "Servico" SET nome='Cx. de Lamínula 24x50', variante1='Cx' WHERE "codigoLegado"=145;
UPDATE "Servico" SET nome='Cx. de Lamínula 24x60', variante1='Cx' WHERE "codigoLegado"=146;
UPDATE "Servico" SET nome='caixa de lâmina carga positiva com 50 un.', variante1='Cx' WHERE "codigoLegado"=161;
UPDATE "Servico" SET nome='Descalcificador 1Lt', variante1='ML' WHERE "codigoLegado"=166;
UPDATE "Servico" SET nome='ÁGUA DESTILADA 5 LTS', variante1='ML' WHERE "codigoLegado"=206;
UPDATE "Servico" SET nome='Tubo para 3 laminas', variante1='Unidade' WHERE "codigoLegado"=225;
UPDATE "Servico" SET nome='Alcool Absoluto', variante1='ML' WHERE "codigoLegado"=256;
UPDATE "Servico" SET nome='BANDEJA PORTA LAMINAS C/ 20 POSICOES', variante1='peça' WHERE "codigoLegado"=259;
UPDATE "Servico" SET nome='Meio de montagem', variante1='ML' WHERE "codigoLegado"=277;
UPDATE "Servico" SET nome='NAVALHA DESCARTÁVEL COM 50 UN.', variante1='Cx' WHERE "codigoLegado"=280;
UPDATE "Servico" SET nome='Caixa de lamínula 24x32 com 100 un', variante1='Cx' WHERE "codigoLegado"=285;
UPDATE "Servico" SET nome='Caixa de lamínula 24x50', variante1='Cx' WHERE "codigoLegado"=286;
UPDATE "Servico" SET nome='Caixa de lamínula 24x60 com 100 un', variante1='Cx' WHERE "codigoLegado"=287;
UPDATE "Servico" SET nome='NAVALHA DESCARTÁVEL', variante1='Unidade' WHERE "codigoLegado"=323;
UPDATE "Servico" SET nome='Eosina solução alcoólica - Lt', variante1='ML' WHERE "codigoLegado"=334;
UPDATE "Servico" SET nome='Caixa de laminas lapidada fosca', variante1='Cx' WHERE "codigoLegado"=358;
UPDATE "Servico" SET nome='Caixa para armazenamento de blocos', variante1='Cx' WHERE "codigoLegado"=363;
UPDATE "Servico" SET nome='Caixa de lminas silanizadas com 50 unidades', variante1='Cx' WHERE "codigoLegado"=365;
UPDATE "Servico" SET nome='Cassetes Histológicos 250 un', variante1='Pct' WHERE "codigoLegado"=378;
UPDATE "Servico" SET nome='XILOL 1LT', variante1='ML' WHERE "codigoLegado"=523;
UPDATE "Servico" SET nome='Frasco de formol 10% 20 ml', variante1='ML' WHERE "codigoLegado"=533;
UPDATE "Servico" SET nome='Descalcificados 250ML', variante1='ML' WHERE "codigoLegado"=663;
UPDATE "Servico" SET nome='Formol tamponado 10% 1L', variante1='ML' WHERE "codigoLegado"=709;
UPDATE "Servico" SET nome='Giemsa Corante Merck 1 lt', variante1='ML' WHERE "codigoLegado"=847;
UPDATE "Servico" SET nome='HD externo Usb 3.0', variante1='Unidade' WHERE "codigoLegado"=902;
