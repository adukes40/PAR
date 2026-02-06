-- CreateTable
CREATE TABLE "dropdown_category" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dropdown_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dropdown_option" (
    "id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "label" VARCHAR(255) NOT NULL,
    "value" VARCHAR(255) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dropdown_option_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approver" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255),
    "sort_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approver_delegate" (
    "id" UUID NOT NULL,
    "approver_id" UUID NOT NULL,
    "delegate_name" VARCHAR(255) NOT NULL,
    "delegate_email" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approver_delegate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "par_request" (
    "id" UUID NOT NULL,
    "job_id" VARCHAR(20) NOT NULL,
    "position_id" UUID,
    "location_id" UUID,
    "fund_line_id" UUID,
    "request_type" VARCHAR(20) NOT NULL,
    "employment_type" VARCHAR(20) NOT NULL,
    "position_duration" VARCHAR(20) NOT NULL,
    "new_employee_name" VARCHAR(255),
    "start_date" DATE,
    "replaced_person" VARCHAR(255),
    "notes" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    "submitted_by" VARCHAR(255),
    "submitted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "par_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_step" (
    "id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "approver_id" UUID NOT NULL,
    "step_order" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "approved_by" VARCHAR(255),
    "approved_at" TIMESTAMP(3),
    "kick_back_to_step" INTEGER,
    "kick_back_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_step_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_id_counter" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "current_year" INTEGER NOT NULL,
    "current_sequence" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "job_id_counter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "changed_by" VARCHAR(255),
    "changes" JSONB,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dropdown_category_name_key" ON "dropdown_category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "dropdown_option_category_id_value_key" ON "dropdown_option"("category_id", "value");

-- CreateIndex
CREATE UNIQUE INDEX "approver_delegate_approver_id_delegate_name_key" ON "approver_delegate"("approver_id", "delegate_name");

-- CreateIndex
CREATE UNIQUE INDEX "par_request_job_id_key" ON "par_request"("job_id");

-- CreateIndex
CREATE UNIQUE INDEX "approval_step_request_id_approver_id_key" ON "approval_step"("request_id", "approver_id");

-- CreateIndex
CREATE INDEX "audit_log_entity_type_entity_id_idx" ON "audit_log"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_log_created_at_idx" ON "audit_log"("created_at");

-- AddForeignKey
ALTER TABLE "dropdown_option" ADD CONSTRAINT "dropdown_option_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "dropdown_category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approver_delegate" ADD CONSTRAINT "approver_delegate_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "approver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "par_request" ADD CONSTRAINT "par_request_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "dropdown_option"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "par_request" ADD CONSTRAINT "par_request_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "dropdown_option"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "par_request" ADD CONSTRAINT "par_request_fund_line_id_fkey" FOREIGN KEY ("fund_line_id") REFERENCES "dropdown_option"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_step" ADD CONSTRAINT "approval_step_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "par_request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_step" ADD CONSTRAINT "approval_step_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "approver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
