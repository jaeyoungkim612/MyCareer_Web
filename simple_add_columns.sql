-- 기존 테이블에 새 컬럼만 추가 (안전한 방법)
ALTER TABLE quality_non_audit_performance 
ADD COLUMN IF NOT EXISTS year_end_time_ratio INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS el_input_hours INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ax_transition_ratio INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS eer_evaluation_score TEXT DEFAULT 'Compliant';

-- 제약조건 추가 (안전하게)
DO $$
BEGIN
    ALTER TABLE quality_non_audit_performance 
    ADD CONSTRAINT check_year_end_ratio CHECK (year_end_time_ratio >= 0 AND year_end_time_ratio <= 100);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE quality_non_audit_performance 
    ADD CONSTRAINT check_el_hours CHECK (el_input_hours >= 0);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE quality_non_audit_performance 
    ADD CONSTRAINT check_ax_ratio CHECK (ax_transition_ratio >= 0 AND ax_transition_ratio <= 100);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE quality_non_audit_performance 
    ADD CONSTRAINT check_eer_score CHECK (eer_evaluation_score IN ('Compliant', 'Non-Compliant', 'Pending'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 확인
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'quality_non_audit_performance' 
AND column_name IN ('year_end_time_ratio', 'el_input_hours', 'ax_transition_ratio', 'eer_evaluation_score');
