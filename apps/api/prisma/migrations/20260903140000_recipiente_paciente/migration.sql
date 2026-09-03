-- Nome do paciente/animal por volume (fluxo Macroscopia, reunião 02/09): a peça
-- que entra no pote é identificada pelo nome já na recepção.
ALTER TABLE "Recipiente" ADD COLUMN "paciente" TEXT;
