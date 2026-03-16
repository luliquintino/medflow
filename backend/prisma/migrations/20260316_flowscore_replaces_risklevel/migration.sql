-- CreateEnum: FlowScore
CREATE TYPE "FlowScore" AS ENUM ('PILAR_SUSTENTAVEL', 'PILAR_CARGA_ELEVADA', 'PILAR_RISCO_FADIGA', 'PILAR_ALTO_RISCO');

-- Migrate risk_history.riskLevel from RiskLevel to FlowScore
ALTER TABLE "risk_history" ADD COLUMN "riskLevel_new" "FlowScore";

UPDATE "risk_history" SET "riskLevel_new" = CASE
  WHEN "riskLevel" = 'SAFE' THEN 'PILAR_SUSTENTAVEL'::"FlowScore"
  WHEN "riskLevel" = 'MODERATE' THEN 'PILAR_CARGA_ELEVADA'::"FlowScore"
  WHEN "riskLevel" = 'HIGH' THEN 'PILAR_RISCO_FADIGA'::"FlowScore"
END;

ALTER TABLE "risk_history" DROP COLUMN "riskLevel";
ALTER TABLE "risk_history" RENAME COLUMN "riskLevel_new" TO "riskLevel";
ALTER TABLE "risk_history" ALTER COLUMN "riskLevel" SET NOT NULL;

-- DropEnum: RiskLevel
DROP TYPE "RiskLevel";

-- AddColumn: WorkProfile.energyCost24hInvertido
ALTER TABLE "work_profiles" ADD COLUMN "energyCost24hInvertido" DOUBLE PRECISION NOT NULL DEFAULT 2.4;

-- AddColumn: WorkProfile.maxNightShifts
ALTER TABLE "work_profiles" ADD COLUMN "maxNightShifts" INTEGER NOT NULL DEFAULT 2;
