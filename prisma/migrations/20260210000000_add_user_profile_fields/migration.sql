-- AlterTable
ALTER TABLE "user" ADD COLUMN "first_name" VARCHAR(255),
ADD COLUMN "last_name" VARCHAR(255),
ADD COLUMN "building_id" UUID,
ADD COLUMN "position_id" UUID;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "dropdown_option"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "dropdown_option"("id") ON DELETE SET NULL ON UPDATE CASCADE;
